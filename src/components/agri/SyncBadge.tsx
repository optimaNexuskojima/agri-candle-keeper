import { AlertTriangle, Check, CloudOff, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { useSyncState } from "@/lib/agri/store";
import { retrySync } from "@/lib/agri/sync";
import { cn } from "@/lib/utils";

/** Compact, unobtrusive sync indicator for the app header. */
export function SyncBadge({ className }: { className?: string }) {
  const state = useSyncState();

  if (!state.signedIn) {
    return (
      <Link
        to="/auth"
        className={cn(
          "pm-label border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
          className,
        )}
      >
        <Smartphone className="size-3" /> On device
      </Link>
    );
  }

  const map = {
    loading: { icon: Loader2, text: "Loading", tone: "text-muted-foreground", spin: true },
    syncing: { icon: Loader2, text: "Syncing", tone: "text-primary", spin: true },
    synced: { icon: Check, text: "Synced", tone: "text-[color:var(--up)]", spin: false },
    offline: { icon: CloudOff, text: "Offline", tone: "text-muted-foreground", spin: false },
    error: { icon: AlertTriangle, text: "Sync error", tone: "text-destructive", spin: false },
    idle: { icon: Check, text: "Ready", tone: "text-muted-foreground", spin: false },
  } as const;

  const view = map[state.status];
  const Icon = view.icon;
  const clickable = state.status === "error" || state.status === "offline" || state.pending > 0;

  return (
    <button
      type="button"
      onClick={() => clickable && retrySync()}
      className={cn(
        "pm-label border-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        view.tone,
        className,
      )}
      title={state.error ?? undefined}
    >
      <Icon className={cn("size-3", view.spin && "animate-spin")} />
      {view.text}
      {state.pending > 0 ? <span>· {state.pending}</span> : null}
      {clickable ? <RefreshCw className="size-3" /> : null}
    </button>
  );
}
