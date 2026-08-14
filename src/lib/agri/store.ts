import { useSyncExternalStore } from "react";

import type { AgriDatabase, Good, Note, PriceEntry, SeasonProfile } from "./types";

export const DB_NAME = "agri-candle-db";

const EMPTY: AgriDatabase = { goods: [], prices: [], notes: [], seasons: [] };

let cache: AgriDatabase | null = null;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalize(raw: unknown): AgriDatabase {
  const value = (raw ?? {}) as Partial<AgriDatabase>;
  return {
    goods: Array.isArray(value.goods) ? (value.goods as Good[]) : [],
    prices: Array.isArray(value.prices) ? (value.prices as PriceEntry[]) : [],
    notes: Array.isArray(value.notes) ? (value.notes as Note[]) : [],
    seasons: Array.isArray(value.seasons) ? (value.seasons as SeasonProfile[]) : [],
  };
}

export function readDb(): AgriDatabase {
  if (!isBrowser()) return EMPTY;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(DB_NAME);
    cache = raw ? normalize(JSON.parse(raw)) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export function writeDb(next: AgriDatabase) {
  cache = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(DB_NAME, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to save data locally", error);
    }
  }
  listeners.forEach((listener) => listener());
}

export function updateDb(mutator: (db: AgriDatabase) => AgriDatabase) {
  writeDb(mutator(readDb()));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDb(): AgriDatabase {
  return useSyncExternalStore(subscribe, readDb, () => EMPTY);
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/* ---------- Goods ---------- */

export function saveGood(input: Omit<Good, "id" | "createdAt"> & { id?: string }): Good {
  const db = readDb();
  if (input.id) {
    const existing = db.goods.find((g) => g.id === input.id);
    const updated: Good = {
      ...(existing as Good),
      ...input,
      id: input.id,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    writeDb({ ...db, goods: db.goods.map((g) => (g.id === updated.id ? updated : g)) });
    return updated;
  }
  const created: Good = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  writeDb({ ...db, goods: [...db.goods, created] });
  return created;
}

export function setGoodArchived(goodId: string, archived: boolean) {
  updateDb((db) => ({
    ...db,
    goods: db.goods.map((g) => (g.id === goodId ? { ...g, archived } : g)),
  }));
}

export function deleteGood(goodId: string) {
  updateDb((db) => ({
    goods: db.goods.filter((g) => g.id !== goodId),
    prices: db.prices.filter((p) => p.goodId !== goodId),
    notes: db.notes.filter((n) => n.goodId !== goodId),
    seasons: db.seasons.filter((s) => s.goodId !== goodId),
  }));
}

/* ---------- Prices ---------- */

export function findPrice(goodId: string, date: string): PriceEntry | undefined {
  return readDb().prices.find((p) => p.goodId === goodId && p.date === date);
}

export function savePrice(
  input: Omit<PriceEntry, "id" | "createdAt" | "updatedAt"> & { id?: string },
): PriceEntry {
  const db = readDb();
  const now = new Date().toISOString();
  const duplicate = db.prices.find(
    (p) => p.goodId === input.goodId && p.date === input.date && p.id !== input.id,
  );
  const targetId = input.id ?? duplicate?.id;
  if (targetId) {
    const existing = db.prices.find((p) => p.id === targetId);
    const updated: PriceEntry = {
      ...(existing as PriceEntry),
      ...input,
      id: targetId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    writeDb({ ...db, prices: db.prices.map((p) => (p.id === targetId ? updated : p)) });
    return updated;
  }
  const created: PriceEntry = { ...input, id: newId(), createdAt: now, updatedAt: now };
  writeDb({ ...db, prices: [...db.prices, created] });
  return created;
}

export function deletePrice(priceId: string) {
  updateDb((db) => ({
    ...db,
    prices: db.prices.filter((p) => p.id !== priceId),
    notes: db.notes.map((n) => (n.priceId === priceId ? { ...n, priceId: undefined } : n)),
  }));
}

/* ---------- Notes ---------- */

export function saveNote(input: Omit<Note, "id" | "createdAt"> & { id?: string }): Note {
  const db = readDb();
  const linked = db.prices.find((p) => p.goodId === input.goodId && p.date === input.date);
  const withLink = { ...input, priceId: input.priceId ?? linked?.id };
  if (input.id) {
    const existing = db.notes.find((n) => n.id === input.id);
    const updated: Note = {
      ...(existing as Note),
      ...withLink,
      id: input.id,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    writeDb({ ...db, notes: db.notes.map((n) => (n.id === updated.id ? updated : n)) });
    return updated;
  }
  const created: Note = { ...withLink, id: newId(), createdAt: new Date().toISOString() };
  writeDb({ ...db, notes: [...db.notes, created] });
  return created;
}

export function deleteNote(noteId: string) {
  updateDb((db) => ({ ...db, notes: db.notes.filter((n) => n.id !== noteId) }));
}

/* ---------- Seasons ---------- */

export function saveSeason(profile: SeasonProfile) {
  updateDb((db) => ({
    ...db,
    seasons: db.seasons.some((s) => s.goodId === profile.goodId)
      ? db.seasons.map((s) => (s.goodId === profile.goodId ? profile : s))
      : [...db.seasons, profile],
  }));
}

export function clearAll() {
  writeDb({ goods: [], prices: [], notes: [], seasons: [] });
}

export function replaceAll(db: AgriDatabase) {
  writeDb(normalize(db));
}