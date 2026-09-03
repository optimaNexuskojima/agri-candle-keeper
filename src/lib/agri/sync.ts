/**
 * AgriCandle cloud sync engine.
 *
 * Strategy
 * --------
 * 1. PUSH: every record flagged dirty in the local snapshot is upserted to the
 *    cloud (soft deletes included, as tombstones). A dirty flag is only cleared
 *    after the cloud confirms the write, so a failed write keeps the change
 *    pending and the UI reports the error instead of a false success.
 * 2. PULL: rows whose `updated_at` is newer than the stored high-water mark are
 *    fetched and merged into the local snapshot.
 * 3. CONFLICTS: last-write-wins on `updatedAt`. A remote row replaces a local
 *    record only when it is strictly newer; a locally dirty record with a newer
 *    (or equal) timestamp is kept and re-pushed on the next cycle.
 * 4. Tombstones (`deletedAt`) are stored, never dropped, so deletions replicate
 *    and stale rows cannot resurrect.
 */

import { supabase } from "@/integrations/supabase/client";

import {
  applySnapshot,
  dirtyKey,
  getScope,
  getSnapshot,
  getSyncState,
  LOCAL_SCOPE,
  onLocalChange,
  setSyncState,
  type Snapshot,
} from "./store";
import type { Good, Note, PriceEntry, SeasonProfile } from "./types";

type Kind = "goods" | "prices" | "notes" | "seasons";

const TABLES: Record<Kind, "goods" | "price_entries" | "notes" | "season_profiles"> = {
  goods: "goods",
  prices: "price_entries",
  notes: "notes",
  seasons: "season_profiles",
};

/* ---------- row mapping (camelCase <-> snake_case) ---------- */

function nn<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function goodToRow(good: Good, userId: string) {
  return {
    id: good.id,
    user_id: userId,
    name: good.name,
    category: nn(good.category),
    unit: good.unit,
    grade: nn(good.grade),
    market_location: nn(good.marketLocation),
    currency: good.currency,
    archived: good.archived,
    created_at: good.createdAt,
    updated_at: good.updatedAt ?? good.createdAt,
    deleted_at: good.deletedAt ?? null,
  };
}

function rowToGood(row: Record<string, unknown>): Good {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    category: (row["category"] as string | null) ?? undefined,
    unit: row["unit"] as string,
    grade: (row["grade"] as string | null) ?? undefined,
    marketLocation: (row["market_location"] as string | null) ?? undefined,
    currency: row["currency"] as string,
    archived: Boolean(row["archived"]),
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
    deletedAt: (row["deleted_at"] as string | null) ?? null,
  };
}

function priceToRow(price: PriceEntry, userId: string) {
  return {
    id: price.id,
    user_id: userId,
    good_id: price.goodId,
    date: price.date,
    close: price.close,
    open: nn(price.open),
    high: nn(price.high),
    low: nn(price.low),
    supply: price.supply,
    demand: price.demand,
    stock_level: nn(price.stockLevel),
    volume_estimate: nn(price.volumeEstimate),
    source: nn(price.source),
    created_at: price.createdAt,
    updated_at: price.updatedAt,
    deleted_at: price.deletedAt ?? null,
  };
}

function rowToPrice(row: Record<string, unknown>): PriceEntry {
  const num = (key: string) => {
    const value = row[key];
    return value === null || value === undefined ? undefined : Number(value);
  };
  return {
    id: row["id"] as string,
    goodId: row["good_id"] as string,
    date: row["date"] as string,
    close: Number(row["close"]),
    open: num("open"),
    high: num("high"),
    low: num("low"),
    supply: row["supply"] as PriceEntry["supply"],
    demand: row["demand"] as PriceEntry["demand"],
    stockLevel: (row["stock_level"] as PriceEntry["stockLevel"]) ?? undefined,
    volumeEstimate: num("volume_estimate"),
    source: (row["source"] as string | null) ?? undefined,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
    deletedAt: (row["deleted_at"] as string | null) ?? null,
  };
}

function noteToRow(note: Note, userId: string) {
  return {
    id: note.id,
    user_id: userId,
    good_id: note.goodId,
    date: note.date,
    price_id: nn(note.priceId),
    direction: note.direction,
    reason_tag: note.reasonTag,
    text: note.text,
    impact: note.impact,
    created_at: note.createdAt,
    updated_at: note.updatedAt ?? note.createdAt,
    deleted_at: note.deletedAt ?? null,
  };
}

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row["id"] as string,
    goodId: row["good_id"] as string,
    date: row["date"] as string,
    priceId: (row["price_id"] as string | null) ?? undefined,
    direction: row["direction"] as Note["direction"],
    reasonTag: row["reason_tag"] as string,
    text: (row["text"] as string) ?? "",
    impact: row["impact"] as Note["impact"],
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
    deletedAt: (row["deleted_at"] as string | null) ?? null,
  };
}

function seasonToRow(season: SeasonProfile, userId: string) {
  return {
    user_id: userId,
    good_id: season.goodId,
    planting_months: season.plantingMonths,
    growing_months: season.growingMonths,
    harvest_months: season.harvestMonths,
    peak_supply_months: season.peakSupplyMonths,
    lean_months: season.leanMonths,
    notes: nn(season.notes),
    updated_at: season.updatedAt ?? new Date().toISOString(),
    deleted_at: season.deletedAt ?? null,
  };
}

function rowToSeason(row: Record<string, unknown>): SeasonProfile {
  const months = (key: string) => ((row[key] as number[] | null) ?? []).map(Number);
  return {
    goodId: row["good_id"] as string,
    plantingMonths: months("planting_months"),
    growingMonths: months("growing_months"),
    harvestMonths: months("harvest_months"),
    peakSupplyMonths: months("peak_supply_months"),
    leanMonths: months("lean_months"),
    notes: (row["notes"] as string | null) ?? undefined,
    updatedAt: row["updated_at"] as string,
    deletedAt: (row["deleted_at"] as string | null) ?? null,
  };
}

/* ---------- helpers ---------- */

function idOf(kind: Kind, record: unknown): string {
  if (kind === "seasons") return (record as SeasonProfile).goodId;
  return (record as { id: string }).id;
}

function isNewer(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "") > (b ?? "");
}

function online(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

let running = false;
let queued = false;
let timer: ReturnType<typeof setInterval> | null = null;
let listenersBound = false;

/* ---------- push ---------- */

async function pushKind(kind: Kind, userId: string): Promise<Set<string>> {
  const snapshot = getSnapshot();
  const pushed = new Set<string>();
  const prefix = `${kind}:`;
  const dirtyIds = Object.keys(snapshot.dirty)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
  if (!dirtyIds.length) return pushed;

  const source: unknown[] =
    kind === "goods"
      ? snapshot.goods
      : kind === "prices"
        ? snapshot.prices
        : kind === "notes"
          ? snapshot.notes
          : snapshot.seasons;

  const records = dirtyIds
    .map((id) => source.find((item) => idOf(kind, item) === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  // Chunk so a large backlog does not exceed request limits.
  const chunkSize = 200;
  for (let index = 0; index < records.length; index += chunkSize) {
    const chunk = records.slice(index, index + chunkSize);
    const rows = chunk.map((record) => {
      if (kind === "goods") return goodToRow(record as Good, userId);
      if (kind === "prices") return priceToRow(record as PriceEntry, userId);
      if (kind === "notes") return noteToRow(record as Note, userId);
      return seasonToRow(record as SeasonProfile, userId);
    });

    const conflictTarget = kind === "seasons" ? "user_id,good_id" : "id";
    let { error } = await supabase
      .from(TABLES[kind])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(rows as any, { onConflict: conflictTarget });

    if (error && kind === "prices" && error.code === "23505") {
      // A remote row already occupies (user, good, date) with a different id.
      // Tombstone the remote duplicate, then retry — the local id wins.
      await resolvePriceDuplicates(chunk as PriceEntry[]);
      ({ error } = await supabase
        .from(TABLES[kind])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(rows as any, { onConflict: conflictTarget }));
    }

    if (error) throw error;
    chunk.forEach((record) => pushed.add(idOf(kind, record)));
  }
  return pushed;
}

async function resolvePriceDuplicates(records: PriceEntry[]) {
  for (const record of records) {
    if (record.deletedAt) continue;
    const { data } = await supabase
      .from("price_entries")
      .select("id")
      .eq("good_id", record.goodId)
      .eq("date", record.date)
      .is("deleted_at", null);
    const clashes = (data ?? []).filter((row) => row.id !== record.id);
    for (const clash of clashes) {
      await supabase
        .from("price_entries")
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", clash.id);
    }
  }
}

/* ---------- pull ---------- */

async function pullKind(kind: Kind, since: string | null): Promise<Record<string, unknown>[]> {
  let query = supabase.from(TABLES[kind]).select("*").order("updated_at", { ascending: true });
  if (since) query = query.gt("updated_at", since);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
}

function mergeRemote<T>(kind: Kind, current: T[], remote: T[], dirty: Record<string, true>): T[] {
  const byId = new Map(current.map((item) => [idOf(kind, item), item]));
  for (const incoming of remote) {
    const id = idOf(kind, incoming);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, incoming);
      continue;
    }
    const localDirty = Boolean(dirty[dirtyKey(kind, id)]);
    const localAt = (existing as { updatedAt?: string }).updatedAt;
    const remoteAt = (incoming as { updatedAt?: string }).updatedAt;
    if (localDirty && !isNewer(remoteAt, localAt)) continue; // keep newer local edit
    if (!localDirty || isNewer(remoteAt, localAt)) byId.set(id, incoming);
  }
  return [...byId.values()];
}

/* ---------- orchestration ---------- */

export async function syncNow(): Promise<void> {
  const state = getSyncState();
  const scope = getScope();
  if (!state.hydrated || scope === LOCAL_SCOPE) return;
  if (running) {
    queued = true;
    return;
  }
  if (!online()) {
    setSyncState({ status: "offline" });
    return;
  }

  running = true;
  setSyncState({ status: "syncing", error: null });
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("Not signed in");
    const userId = userData.user.id;

    // ---- push ----
    const pushed: Record<Kind, Set<string>> = {
      goods: await pushKind("goods", userId),
      prices: await pushKind("prices", userId),
      notes: await pushKind("notes", userId),
      seasons: await pushKind("seasons", userId),
    };

    // ---- pull ----
    const before = getSnapshot();
    const since = before.lastPulledAt;
    const [goodRows, priceRows, noteRows, seasonRows] = await Promise.all([
      pullKind("goods", since),
      pullKind("prices", since),
      pullKind("notes", since),
      pullKind("seasons", since),
    ]);

    const latest = [...goodRows, ...priceRows, ...noteRows, ...seasonRows].reduce<string | null>(
      (max, row) => {
        const at = row["updated_at"] as string | undefined;
        return at && (!max || at > max) ? at : max;
      },
      since,
    );

    // Recompute from the freshest snapshot (mutations may have landed mid-sync).
    const current = getSnapshot();
    const dirty = { ...current.dirty };
    // Clear dirty flags only for records confirmed by the cloud AND untouched since.
    (Object.keys(pushed) as Kind[]).forEach((kind) => {
      pushed[kind].forEach((id) => {
        const key = dirtyKey(kind, id);
        const beforeRecord = findRecord(before, kind, id);
        const afterRecord = findRecord(current, kind, id);
        const unchanged =
          (beforeRecord as { updatedAt?: string } | undefined)?.updatedAt ===
          (afterRecord as { updatedAt?: string } | undefined)?.updatedAt;
        if (unchanged) delete dirty[key];
      });
    });

    const next: Snapshot = {
      ...current,
      goods: mergeRemote("goods", current.goods, goodRows.map(rowToGood), dirty),
      prices: mergeRemote("prices", current.prices, priceRows.map(rowToPrice), dirty),
      notes: mergeRemote("notes", current.notes, noteRows.map(rowToNote), dirty),
      seasons: mergeRemote("seasons", current.seasons, seasonRows.map(rowToSeason), dirty),
      dirty,
      lastPulledAt: latest,
    };

    applySnapshot(next, { local: false });
    const remaining = Object.keys(next.dirty).length;
    setSyncState({
      status: remaining > 0 ? "syncing" : "synced",
      lastSyncedAt: new Date().toISOString(),
      error: null,
    });
    if (remaining > 0) queued = true;
  } catch (error) {
    console.error("[AgriCandle] sync failed", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    setSyncState({ status: online() ? "error" : "offline", error: message });
  } finally {
    running = false;
    if (queued) {
      queued = false;
      // Give the failed/partial cycle a moment before retrying.
      setTimeout(() => void syncNow(), 1500);
    }
  }
}

function findRecord(snapshot: Snapshot, kind: Kind, id: string): unknown {
  const source: unknown[] =
    kind === "goods"
      ? snapshot.goods
      : kind === "prices"
        ? snapshot.prices
        : kind === "notes"
          ? snapshot.notes
          : snapshot.seasons;
  return source.find((item) => idOf(kind, item) === id);
}

/** Manual retry used by the sync status UI. */
export function retrySync() {
  void syncNow();
}

let debounce: ReturnType<typeof setTimeout> | null = null;

function scheduleSync(delay = 800) {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    void syncNow();
  }, delay);
}

/**
 * Bind sync triggers once: local mutations, connectivity, visibility and a slow
 * background interval. Safe to call repeatedly.
 */
export function startSyncEngine(): () => void {
  if (typeof window === "undefined" || listenersBound) return () => {};
  listenersBound = true;

  const unsubscribe = onLocalChange(() => scheduleSync());
  const onOnline = () => scheduleSync(200);
  const onVisible = () => {
    if (document.visibilityState === "visible") scheduleSync(200);
  };
  const onOffline = () => setSyncState({ status: "offline" });

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);
  timer = setInterval(() => void syncNow(), 60_000);

  return () => {
    listenersBound = false;
    unsubscribe();
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisible);
    if (timer) clearInterval(timer);
    timer = null;
  };
}
