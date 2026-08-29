import { useSyncExternalStore } from "react";

import { idbGet, idbSet } from "./idb";
import type { AgriDatabase, Good, Note, PriceEntry, SeasonProfile } from "./types";

/**
 * AgriCandle persistence layer.
 *
 * Architecture
 * ------------
 * - The UI reads a synchronous, in-memory view of the data (`useDb`), so all
 *   existing components keep working unchanged.
 * - Every write is applied locally first (optimistic, offline-first), stamped
 *   with `updatedAt`, flagged dirty, and persisted to IndexedDB.
 * - `sync.ts` drains dirty records to the cloud and pulls remote changes.
 * - Deletes are soft (tombstones with `deletedAt`) so they replicate to other
 *   devices and cannot be resurrected by a stale cache.
 * - Conflicts resolve last-write-wins on `updatedAt`: the latest intentional
 *   edit wins. A local dirty record is only replaced by a remote row whose
 *   `updatedAt` is strictly newer.
 */

/** Legacy localStorage key from the offline-only version (kept as a backup). */
export const DB_NAME = "agri-candle-db";
export const LOCAL_SCOPE = "local";

const SNAPSHOT_VERSION = 2 as const;

export interface Snapshot {
  version: typeof SNAPSHOT_VERSION;
  goods: Good[];
  prices: PriceEntry[];
  notes: Note[];
  seasons: SeasonProfile[];
  /** Keys (`kind:id`) of records with local changes not yet confirmed by the cloud. */
  dirty: Record<string, true>;
  /** Server `updated_at` high-water mark used for incremental pulls. */
  lastPulledAt: string | null;
  /** Set once local (signed-out) data has been imported into this account. */
  importedLocalAt?: string | null;
}

export type SyncStatus = "idle" | "loading" | "syncing" | "synced" | "offline" | "error";

export interface SyncState {
  status: SyncStatus;
  hydrated: boolean;
  signedIn: boolean;
  pending: number;
  lastSyncedAt: string | null;
  error: string | null;
}

const EMPTY_VIEW: AgriDatabase = { goods: [], prices: [], notes: [], seasons: [] };

function emptySnapshot(): Snapshot {
  return {
    version: SNAPSHOT_VERSION,
    goods: [],
    prices: [],
    notes: [],
    seasons: [],
    dirty: {},
    lastPulledAt: null,
    importedLocalAt: null,
  };
}

/* ---------- module state ---------- */

let scope: string = LOCAL_SCOPE;
let snapshot: Snapshot = emptySnapshot();
let view: AgriDatabase = EMPTY_VIEW;
let syncState: SyncState = {
  status: "idle",
  hydrated: false,
  signedIn: false,
  pending: 0,
  lastSyncedAt: null,
  error: null,
};

const dataListeners = new Set<() => void>();
const syncListeners = new Set<() => void>();
const changeHandlers = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function cacheKey(target: string) {
  return `snapshot:${target}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback so ids stay valid uuids for the cloud database.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/* ---------- view projection ---------- */

function alive<T extends { deletedAt?: string | null | undefined }>(items: T[]): T[] {
  return items.filter((item) => !item.deletedAt);
}

function project(next: Snapshot): AgriDatabase {
  return {
    goods: alive(next.goods),
    prices: alive(next.prices),
    notes: alive(next.notes),
    seasons: alive(next.seasons),
  };
}

function countPending(next: Snapshot): number {
  return Object.keys(next.dirty).length;
}

function notifyData() {
  dataListeners.forEach((listener) => listener());
}

function notifySync() {
  syncListeners.forEach((listener) => listener());
}

export function setSyncState(patch: Partial<SyncState>) {
  syncState = { ...syncState, ...patch };
  notifySync();
}

/** Persist the snapshot for the active scope and refresh subscribers. */
function commit(next: Snapshot, options: { local?: boolean } = {}) {
  snapshot = next;
  view = project(next);
  setSyncState({ pending: countPending(next) });
  notifyData();
  if (isBrowser()) void idbSet(cacheKey(scope), next);
  if (options.local !== false) changeHandlers.forEach((handler) => handler());
}

/* ---------- public read API ---------- */

export function readDb(): AgriDatabase {
  return view;
}

function subscribeData(listener: () => void) {
  dataListeners.add(listener);
  return () => dataListeners.delete(listener);
}

export function useDb(): AgriDatabase {
  return useSyncExternalStore(subscribeData, readDb, () => EMPTY_VIEW);
}

function subscribeSync(listener: () => void) {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

export function getSyncState(): SyncState {
  return syncState;
}

const SERVER_SYNC_STATE: SyncState = {
  status: "loading",
  hydrated: false,
  signedIn: false,
  pending: 0,
  lastSyncedAt: null,
  error: null,
};

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSync, getSyncState, () => SERVER_SYNC_STATE);
}

/* ---------- sync engine hooks (used by sync.ts) ---------- */

export function getSnapshot(): Snapshot {
  return snapshot;
}

export function getScope(): string {
  return scope;
}

export function applySnapshot(next: Snapshot, options: { local?: boolean } = { local: false }) {
  commit(next, options);
}

export function onLocalChange(handler: () => void) {
  changeHandlers.add(handler);
  return () => changeHandlers.delete(handler);
}

export function dirtyKey(kind: "goods" | "prices" | "notes" | "seasons", id: string) {
  return `${kind}:${id}`;
}

/* ---------- hydration & migration ---------- */

function normalizeRecords(raw: unknown): Omit<Snapshot, "version" | "dirty" | "lastPulledAt"> {
  const value = (raw ?? {}) as Partial<Snapshot>;
  return {
    goods: Array.isArray(value.goods) ? value.goods : [],
    prices: Array.isArray(value.prices) ? value.prices : [],
    notes: Array.isArray(value.notes) ? value.notes : [],
    seasons: Array.isArray(value.seasons) ? value.seasons : [],
  };
}

/**
 * Read the legacy localStorage database. The key is never deleted: it stays as
 * an automatic backup of the pre-cloud data.
 */
export function readLegacyLocalStorage(): AgriDatabase | null {
  if (!isBrowser() || typeof window.localStorage === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DB_NAME);
    if (!raw) return null;
    const parsed = normalizeRecords(JSON.parse(raw));
    if (
      !parsed.goods.length &&
      !parsed.prices.length &&
      !parsed.notes.length &&
      !parsed.seasons.length
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function stampAll(db: AgriDatabase, at: string): Snapshot {
  const next = emptySnapshot();
  next.goods = db.goods.map((g) => ({ ...g, updatedAt: g.updatedAt ?? at, deletedAt: null }));
  next.prices = db.prices.map((p) => ({ ...p, updatedAt: p.updatedAt ?? at, deletedAt: null }));
  next.notes = db.notes.map((n) => ({ ...n, updatedAt: n.updatedAt ?? at, deletedAt: null }));
  next.seasons = db.seasons.map((s) => ({ ...s, updatedAt: s.updatedAt ?? at, deletedAt: null }));
  next.goods.forEach((g) => (next.dirty[dirtyKey("goods", g.id)] = true));
  next.prices.forEach((p) => (next.dirty[dirtyKey("prices", p.id)] = true));
  next.notes.forEach((n) => (next.dirty[dirtyKey("notes", n.id)] = true));
  next.seasons.forEach((s) => (next.dirty[dirtyKey("seasons", s.goodId)] = true));
  return next;
}

async function loadSnapshot(target: string): Promise<Snapshot> {
  const cached = await idbGet<Snapshot>(cacheKey(target));
  if (cached && cached.version === SNAPSHOT_VERSION) {
    return { ...emptySnapshot(), ...cached, dirty: cached.dirty ?? {} };
  }
  if (target === LOCAL_SCOPE) {
    // One-time, non-destructive migration of the original localStorage data.
    const legacy = readLegacyLocalStorage();
    if (legacy) return stampAll(legacy, nowISO());
  }
  return emptySnapshot();
}

/**
 * Load the cache for a scope (user id, or `local` when signed out) and expose it
 * to the UI. Nothing is ever pushed to the cloud from here; that is sync.ts.
 */
export async function hydrateScope(target: string): Promise<Snapshot> {
  scope = target;
  setSyncState({ status: "loading", hydrated: false });
  const loaded = await loadSnapshot(target);
  snapshot = loaded;
  view = project(loaded);
  setSyncState({
    hydrated: true,
    pending: countPending(loaded),
    signedIn: target !== LOCAL_SCOPE,
    error: null,
  });
  notifyData();
  return loaded;
}

/**
 * Merge signed-out local data into the freshly signed-in account.
 * Idempotent: it runs once per account/device and only adds records whose ids
 * are not already known, so re-running can never duplicate rows.
 */
export async function importLocalDataIntoScope(): Promise<number> {
  if (scope === LOCAL_SCOPE) return 0;
  if (snapshot.importedLocalAt) return 0;
  const local = await loadSnapshot(LOCAL_SCOPE);
  const at = nowISO();
  const next: Snapshot = {
    ...snapshot,
    dirty: { ...snapshot.dirty },
    importedLocalAt: at,
  };
  let added = 0;

  const merge = <T extends { updatedAt?: string | undefined }>(
    kind: "goods" | "prices" | "notes" | "seasons",
    current: T[],
    incoming: T[],
    idOf: (item: T) => string,
  ): T[] => {
    const known = new Set(current.map(idOf));
    const extras = incoming.filter((item) => !known.has(idOf(item)));
    extras.forEach((item) => {
      next.dirty[dirtyKey(kind, idOf(item))] = true;
      added += 1;
    });
    return [...current, ...extras.map((item) => ({ ...item, updatedAt: item.updatedAt ?? at }))];
  };

  next.goods = merge("goods", next.goods, local.goods, (g) => g.id);
  next.prices = merge("prices", next.prices, local.prices, (p) => p.id);
  next.notes = merge("notes", next.notes, local.notes, (n) => n.id);
  next.seasons = merge("seasons", next.seasons, local.seasons, (s) => s.goodId);

  commit(next);
  return added;
}

/* ---------- mutation helpers ---------- */

function mutate(mutator: (draft: Snapshot) => void) {
  const next: Snapshot = {
    ...snapshot,
    goods: [...snapshot.goods],
    prices: [...snapshot.prices],
    notes: [...snapshot.notes],
    seasons: [...snapshot.seasons],
    dirty: { ...snapshot.dirty },
  };
  mutator(next);
  commit(next);
}

/* ---------- Goods ---------- */

export function saveGood(input: Omit<Good, "id" | "createdAt"> & { id?: string }): Good {
  const at = nowISO();
  const existing = input.id ? snapshot.goods.find((g) => g.id === input.id) : undefined;
  const record: Good = {
    ...(existing as Good | undefined),
    ...input,
    id: input.id ?? newId(),
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    deletedAt: null,
  };
  mutate((draft) => {
    draft.goods = existing
      ? draft.goods.map((g) => (g.id === record.id ? record : g))
      : [...draft.goods, record];
    draft.dirty[dirtyKey("goods", record.id)] = true;
  });
  return record;
}

export function setGoodArchived(goodId: string, archived: boolean) {
  const at = nowISO();
  mutate((draft) => {
    draft.goods = draft.goods.map((g) =>
      g.id === goodId ? { ...g, archived, updatedAt: at } : g,
    );
    draft.dirty[dirtyKey("goods", goodId)] = true;
  });
}

export function deleteGood(goodId: string) {
  const at = nowISO();
  mutate((draft) => {
    draft.goods = draft.goods.map((g) =>
      g.id === goodId ? { ...g, deletedAt: at, updatedAt: at } : g,
    );
    draft.dirty[dirtyKey("goods", goodId)] = true;
    draft.prices = draft.prices.map((p) => {
      if (p.goodId !== goodId || p.deletedAt) return p;
      draft.dirty[dirtyKey("prices", p.id)] = true;
      return { ...p, deletedAt: at, updatedAt: at };
    });
    draft.notes = draft.notes.map((n) => {
      if (n.goodId !== goodId || n.deletedAt) return n;
      draft.dirty[dirtyKey("notes", n.id)] = true;
      return { ...n, deletedAt: at, updatedAt: at };
    });
    draft.seasons = draft.seasons.map((s) => {
      if (s.goodId !== goodId || s.deletedAt) return s;
      draft.dirty[dirtyKey("seasons", s.goodId)] = true;
      return { ...s, deletedAt: at, updatedAt: at };
    });
  });
}

/* ---------- Prices ---------- */

export function findPrice(goodId: string, date: string): PriceEntry | undefined {
  return view.prices.find((p) => p.goodId === goodId && p.date === date);
}

export function savePrice(
  input: Omit<PriceEntry, "id" | "createdAt" | "updatedAt"> & { id?: string },
): PriceEntry {
  const at = nowISO();
  // One price per good per date (also enforced by a unique index in the cloud).
  const duplicate = view.prices.find(
    (p) => p.goodId === input.goodId && p.date === input.date && p.id !== input.id,
  );
  const targetId = input.id ?? duplicate?.id;
  const existing = targetId ? snapshot.prices.find((p) => p.id === targetId) : undefined;
  const record: PriceEntry = {
    ...(existing as PriceEntry | undefined),
    ...input,
    id: targetId ?? newId(),
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    deletedAt: null,
  };
  mutate((draft) => {
    draft.prices = existing
      ? draft.prices.map((p) => (p.id === record.id ? record : p))
      : [...draft.prices, record];
    draft.dirty[dirtyKey("prices", record.id)] = true;
  });
  return record;
}

export function deletePrice(priceId: string) {
  const at = nowISO();
  mutate((draft) => {
    draft.prices = draft.prices.map((p) =>
      p.id === priceId ? { ...p, deletedAt: at, updatedAt: at } : p,
    );
    draft.dirty[dirtyKey("prices", priceId)] = true;
    draft.notes = draft.notes.map((n) => {
      if (n.priceId !== priceId) return n;
      draft.dirty[dirtyKey("notes", n.id)] = true;
      return { ...n, priceId: undefined, updatedAt: at };
    });
  });
}

/* ---------- Notes ---------- */

export function saveNote(input: Omit<Note, "id" | "createdAt"> & { id?: string }): Note {
  const at = nowISO();
  const linked = view.prices.find((p) => p.goodId === input.goodId && p.date === input.date);
  const existing = input.id ? snapshot.notes.find((n) => n.id === input.id) : undefined;
  const record: Note = {
    ...(existing as Note | undefined),
    ...input,
    priceId: input.priceId ?? linked?.id,
    id: input.id ?? newId(),
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    deletedAt: null,
  };
  mutate((draft) => {
    draft.notes = existing
      ? draft.notes.map((n) => (n.id === record.id ? record : n))
      : [...draft.notes, record];
    draft.dirty[dirtyKey("notes", record.id)] = true;
  });
  return record;
}

export function deleteNote(noteId: string) {
  const at = nowISO();
  mutate((draft) => {
    draft.notes = draft.notes.map((n) =>
      n.id === noteId ? { ...n, deletedAt: at, updatedAt: at } : n,
    );
    draft.dirty[dirtyKey("notes", noteId)] = true;
  });
}

/* ---------- Seasons ---------- */

export function saveSeason(profile: SeasonProfile) {
  const at = nowISO();
  const record: SeasonProfile = { ...profile, updatedAt: at, deletedAt: null };
  mutate((draft) => {
    draft.seasons = draft.seasons.some((s) => s.goodId === record.goodId)
      ? draft.seasons.map((s) => (s.goodId === record.goodId ? record : s))
      : [...draft.seasons, record];
    draft.dirty[dirtyKey("seasons", record.goodId)] = true;
  });
}

/* ---------- Bulk operations ---------- */

/** Soft-delete everything (syncs the deletions; never a silent local wipe). */
export function clearAll() {
  const at = nowISO();
  mutate((draft) => {
    draft.goods = draft.goods.map((g) => {
      if (g.deletedAt) return g;
      draft.dirty[dirtyKey("goods", g.id)] = true;
      return { ...g, deletedAt: at, updatedAt: at };
    });
    draft.prices = draft.prices.map((p) => {
      if (p.deletedAt) return p;
      draft.dirty[dirtyKey("prices", p.id)] = true;
      return { ...p, deletedAt: at, updatedAt: at };
    });
    draft.notes = draft.notes.map((n) => {
      if (n.deletedAt) return n;
      draft.dirty[dirtyKey("notes", n.id)] = true;
      return { ...n, deletedAt: at, updatedAt: at };
    });
    draft.seasons = draft.seasons.map((s) => {
      if (s.deletedAt) return s;
      draft.dirty[dirtyKey("seasons", s.goodId)] = true;
      return { ...s, deletedAt: at, updatedAt: at };
    });
  });
}

/** Replace the visible data set (backup import / sample data). */
export function replaceAll(db: AgriDatabase) {
  const at = nowISO();
  clearAll();
  mutate((draft) => {
    const incomingGoodIds = new Set(db.goods.map((g) => g.id));
    db.goods.forEach((good) => {
      const record: Good = { ...good, updatedAt: at, deletedAt: null };
      const index = draft.goods.findIndex((g) => g.id === good.id);
      if (index >= 0) draft.goods[index] = record;
      else draft.goods.push(record);
      draft.dirty[dirtyKey("goods", good.id)] = true;
    });
    db.prices.forEach((price) => {
      if (!incomingGoodIds.has(price.goodId)) return;
      const record: PriceEntry = { ...price, updatedAt: at, deletedAt: null };
      const index = draft.prices.findIndex((p) => p.id === price.id);
      if (index >= 0) draft.prices[index] = record;
      else draft.prices.push(record);
      draft.dirty[dirtyKey("prices", price.id)] = true;
    });
    db.notes.forEach((note) => {
      if (!incomingGoodIds.has(note.goodId)) return;
      const record: Note = { ...note, updatedAt: at, deletedAt: null };
      const index = draft.notes.findIndex((n) => n.id === note.id);
      if (index >= 0) draft.notes[index] = record;
      else draft.notes.push(record);
      draft.dirty[dirtyKey("notes", note.id)] = true;
    });
    db.seasons.forEach((season) => {
      if (!incomingGoodIds.has(season.goodId)) return;
      const record: SeasonProfile = { ...season, updatedAt: at, deletedAt: null };
      const index = draft.seasons.findIndex((s) => s.goodId === season.goodId);
      if (index >= 0) draft.seasons[index] = record;
      else draft.seasons.push(record);
      draft.dirty[dirtyKey("seasons", season.goodId)] = true;
    });
  });
}
