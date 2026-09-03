import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Download,
  FileUp,
  Loader2,
  LogOut,
  RefreshCw,
  Share,
  Smartphone,
  Sprout,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  exportGoodsCsv,
  exportJson,
  exportNotesCsv,
  exportPricesCsv,
  parseBackup,
} from "@/lib/agri/backup";
import { buildSampleData } from "@/lib/agri/sample";
import { clearAll, replaceAll, useDb, useSyncState } from "@/lib/agri/store";
import { signOutAndReset, useSession } from "@/lib/agri/session";
import { retrySync } from "@/lib/agri/sync";
import type { AgriDatabase } from "@/lib/agri/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Backup — AgriCandle" },
      {
        name: "description",
        content:
          "Export a JSON backup, import data, download CSV files, load sample data or clear everything on this device.",
      },
      { property: "og:title", content: "Settings & Backup — AgriCandle" },
      {
        property: "og:description",
        content: "Own your data: local backups, CSV exports and iPhone install instructions.",
      },
    ],
  }),
  component: SettingsPage,
});

const SYNC_VIEW = {
  loading: { icon: Loader2, label: "Loading", tone: "text-muted-foreground", spin: true },
  syncing: { icon: Loader2, label: "Syncing", tone: "text-primary", spin: true },
  synced: { icon: Check, label: "Synced", tone: "text-up", spin: false },
  offline: { icon: CloudOff, label: "Offline", tone: "text-muted-foreground", spin: false },
  error: { icon: AlertTriangle, label: "Sync error", tone: "text-destructive", spin: false },
  idle: { icon: Check, label: "Ready", tone: "text-muted-foreground", spin: false },
} as const;

function formatWhen(iso: string | null): string {
  if (!iso) return "not yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "not yet";
  return date.toLocaleString();
}

function AccountSyncCard() {
  const session = useSession();
  const sync = useSyncState();
  const [signingOut, setSigningOut] = useState(false);

  if (!session) {
    return (
      <section className="pm-card space-y-2 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Smartphone className="size-4" /> Account & Sync
        </p>
        <p className="text-muted-foreground text-sm">
          You're signed out. Everything you record stays on this device only — nothing leaves your
          phone or computer. Sign in to keep the same goods, prices, notes and seasons on all of
          your devices.
        </p>
        <Button asChild className="h-11 w-full">
          <Link to="/auth">Sign in to sync devices</Link>
        </Button>
      </section>
    );
  }

  const view = SYNC_VIEW[sync.status];
  const Icon = view.icon;
  const needsRetry = sync.status === "error" || sync.status === "offline" || sync.pending > 0;

  return (
    <section className="pm-card space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Account & Sync</p>
          <p className="text-muted-foreground text-sm break-all">{session.user.email}</p>
        </div>
        <span
          className={`pm-label border-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${view.tone}`}
        >
          <Icon className={`size-3 ${view.spin ? "animate-spin" : ""}`} />
          {view.label}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="pm-label">Pending changes</dt>
          <dd className="tabular-nums font-semibold">{sync.pending}</dd>
        </div>
        <div>
          <dt className="pm-label">Last synced</dt>
          <dd className="font-medium">{formatWhen(sync.lastSyncedAt)}</dd>
        </div>
      </dl>

      {sync.error ? <p className="text-destructive text-sm">{sync.error}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" className="h-11" onClick={() => retrySync()}>
          <RefreshCw className="size-4" /> {needsRetry ? "Retry sync" : "Sync now"}
        </Button>
        <Button
          variant="outline"
          className="h-11"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOutAndReset();
              toast.success("Signed out — this device is local-only again");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not sign out");
            } finally {
              setSigningOut(false);
            }
          }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </section>
  );
}

function SettingsPage() {
  const db = useDb();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AgriDatabase | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBackup(String(reader.result ?? ""));
      if (!parsed) {
        toast.error("That file is not a valid AgriCandle backup");
        return;
      }
      setPendingImport(parsed);
    };
    reader.onerror = () => toast.error("Could not read the file");
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <AccountSyncCard />

      <section className="pm-card space-y-2 p-4">
        <p className="font-semibold">Your data</p>
        <p className="text-muted-foreground text-sm">
          {db.goods.length} goods · {db.prices.length} price entries · {db.notes.length} notes
        </p>
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <Button className="h-11" onClick={() => exportJson(db)}>
            <Download className="size-4" /> Export JSON backup
          </Button>
          <Button variant="outline" className="h-11" onClick={() => fileInput.current?.click()}>
            <FileUp className="size-4" /> Import JSON backup
          </Button>
          <Button variant="outline" className="h-11" onClick={() => exportPricesCsv(db)}>
            Export prices CSV
          </Button>
          <Button variant="outline" className="h-11" onClick={() => exportGoodsCsv(db)}>
            Export goods CSV
          </Button>
          <Button variant="outline" className="h-11" onClick={() => exportNotesCsv(db)}>
            Export notes CSV
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
      </section>

      <section className="pm-card space-y-2 p-4">
        <p className="font-semibold">Get started quickly</p>
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => {
            replaceAll(buildSampleData());
            toast.success("Sample data loaded");
          }}
        >
          <Sprout className="size-4" /> Load sample data
        </Button>
        <Button variant="destructive" className="h-11 w-full" onClick={() => setClearOpen(true)}>
          <Trash2 className="size-4" /> Clear all data
        </Button>
      </section>

      <section className="pm-card space-y-2 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Share className="size-4" /> Add to Home Screen (iPhone)
        </p>
        <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
          <li>Open AgriCandle in Safari.</li>
          <li>Tap the Share button at the bottom of the screen.</li>
          <li>Scroll down and tap “Add to Home Screen”.</li>
          <li>Tap “Add”. AgriCandle now opens like an app and works offline.</li>
        </ol>
      </section>

      <section className="pm-card space-y-1 p-4">
        <p className="font-semibold">About AgriCandle</p>
        <p className="text-muted-foreground text-sm">
          AgriCandle is an offline-first commodity price tracker for agricultural traders. Prices,
          notes and season profiles are always written to this device first, so the app keeps
          working with no connection and no account. If you sign in, your own records also sync to
          your private cloud account over an encrypted connection — access rules make sure only you
          can read or change your rows. No market feeds, no tracking, no paid features.
        </p>
      </section>

      <AlertDialog
        open={Boolean(pendingImport)}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all current data?</AlertDialogTitle>
            <AlertDialogDescription>
              This backup has {pendingImport?.goods.length ?? 0} goods,{" "}
              {pendingImport?.prices.length ?? 0} prices and {pendingImport?.notes.length ?? 0}{" "}
              notes. Importing replaces everything currently on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImport) replaceAll(pendingImport);
                setPendingImport(null);
                toast.success("Backup imported");
              }}
            >
              Import and replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every good, price, note and season profile on this device.
              Export a backup first if you may need it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAll();
                toast.success("All data cleared");
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
