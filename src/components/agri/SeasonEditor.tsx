import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { saveSeason, useDb } from "@/lib/agri/store";
import { currentSeasonStatus, seasonAlerts } from "@/lib/agri/logic";
import { MONTH_NAMES, type SeasonProfile } from "@/lib/agri/types";
import { SeasonBadge } from "@/components/agri/badges";

const ROWS: Array<{
  key: keyof Omit<SeasonProfile, "goodId" | "notes" | "updatedAt" | "deletedAt">;

  label: string;
  active: string;
}> = [
  { key: "plantingMonths", label: "Planting", active: "bg-planting text-primary-foreground" },
  { key: "growingMonths", label: "Growing", active: "bg-growing text-foreground" },
  { key: "harvestMonths", label: "Harvest", active: "bg-harvest text-foreground" },
  { key: "peakSupplyMonths", label: "Peak Supply", active: "bg-peak-supply text-foreground" },
  { key: "leanMonths", label: "Lean Supply", active: "bg-lean text-primary-foreground" },
];

export function SeasonEditor({ goodId }: { goodId: string }) {
  const db = useDb();
  const profile: SeasonProfile = db.seasons.find((s) => s.goodId === goodId) ?? {
    goodId,
    plantingMonths: [],
    growingMonths: [],
    harvestMonths: [],
    peakSupplyMonths: [],
    leanMonths: [],
  };
  const currentMonth = new Date().getMonth() + 1;
  const status = currentSeasonStatus(db.seasons.find((s) => s.goodId === goodId));
  const alerts = seasonAlerts(db.seasons.find((s) => s.goodId === goodId));

  function toggle(key: (typeof ROWS)[number]["key"], month: number) {
    const months = profile[key];
    const next = months.includes(month)
      ? months.filter((m) => m !== month)
      : [...months, month].sort((a, b) => a - b);
    saveSeason({ ...profile, [key]: next });
    toast.success("Season updated");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Current status:</span>
        <SeasonBadge status={status} />
      </div>

      {alerts.length > 0 && (
        <ul className="space-y-1">
          {alerts.map((alert) => (
            <li key={alert} className="bg-harvest/15 text-foreground rounded-xl px-3 py-2 text-sm">
              {alert}
            </li>
          ))}
        </ul>
      )}

      {ROWS.map((row) => (
        <div key={row.key} className="space-y-2">
          <p className="text-sm font-semibold">{row.label}</p>
          <div className="grid grid-cols-6 gap-1.5">
            {MONTH_NAMES.map((name, index) => {
              const month = index + 1;
              const active = profile[row.key].includes(month);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(row.key, month)}
                  className={cn(
                    "h-10 rounded-xl border text-xs font-semibold transition-colors",
                    active ? row.active : "bg-card text-muted-foreground",
                    month === currentMonth && !active && "border-primary border-2",
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-muted-foreground text-xs">
        Tap a month to turn it on or off. The outlined month is the current month.
      </p>
    </div>
  );
}
