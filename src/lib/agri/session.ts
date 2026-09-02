/**
 * Session wiring for AgriCandle.
 *
 * Signed out, the app stays fully local (scope `local`, IndexedDB only) — no
 * cloud writes are attempted. Signing in switches the cache scope to the user
 * id, imports any signed-out local data once (idempotent), and starts sync.
 * The legacy localStorage key "agri-candle-db" is never deleted.
 */

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import {
  hydrateScope,
  importLocalDataIntoScope,
  LOCAL_SCOPE,
  readLegacyLocalStorage,
  setSyncState,
} from "./store";
import { startSyncEngine, syncNow } from "./sync";

let started = false;
let currentScope: string | null = null;
let stopEngine: (() => void) | null = null;

const sessionListeners = new Set<() => void>();
let currentSession: Session | null = null;

function notify() {
  sessionListeners.forEach((listener) => listener());
}

async function applyScope(userId: string | null) {
  const target = userId ?? LOCAL_SCOPE;
  if (currentScope === target) return;
  currentScope = target;
  await hydrateScope(target);
  if (!userId) {
    setSyncState({ status: "idle", signedIn: false, error: null });
    return;
  }
  // First sign-in on a device that has local-only data: bring it along.
  const imported = await importLocalDataIntoScope();
  if (imported > 0 || readLegacyLocalStorage()) {
    // nothing else to do; the dirty flags set by the import drive the push
  }
  await syncNow();
}

/** Called once from the app shell. Hydrates the right scope and binds sync. */
export function initSession(): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) return () => {};
  started = true;

  stopEngine = startSyncEngine();

  void supabase.auth.getSession().then(({ data }) => {
    currentSession = data.session ?? null;
    notify();
    void applyScope(data.session?.user.id ?? null);
  });

  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    currentSession = session ?? null;
    notify();
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      void applyScope(session?.user.id ?? null);
    }
  });

  return () => {
    started = false;
    sub.subscription.unsubscribe();
    stopEngine?.();
    stopEngine = null;
  };
}

export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(currentSession);
  useEffect(() => {
    const listener = () => setSession(currentSession);
    sessionListeners.add(listener);
    listener();
    return () => {
      sessionListeners.delete(listener);
    };
  }, []);
  return session;
}

export async function signOutAndReset() {
  await supabase.auth.signOut();
  await applyScope(null);
}
