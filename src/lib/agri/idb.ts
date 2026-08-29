/**
 * Tiny IndexedDB key/value wrapper used as the offline cache for AgriCandle.
 *
 * Snapshots are stored per scope (`local` for signed-out data, otherwise the
 * user id). If IndexedDB is unavailable (private mode, old browsers) we fall
 * back to localStorage so the app never loses the ability to persist offline.
 */

const DB_NAME = "agri-candle-cache";
const STORE = "snapshots";
const FALLBACK_PREFIX = "agri-candle-cache:";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return fallbackGet<T>(key);
  return new Promise<T | null>((resolve) => {
    try {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => resolve(fallbackGet<T>(key));
    } catch {
      resolve(fallbackGet<T>(key));
    }
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) {
    fallbackSet(key, value);
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        fallbackSet(key, value);
        resolve();
      };
    } catch {
      fallbackSet(key, value);
      resolve();
    }
  });
}

function fallbackGet<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(FALLBACK_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function fallbackSet(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FALLBACK_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to persist offline cache", error);
  }
}
