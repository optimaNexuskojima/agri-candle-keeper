import { cn } from "@/lib/utils";
import type { PressureLabel, SeasonStatus } from "@/lib/agri/logic";
import {
  DEMAND_LABELS,
  SUPPLY_LABELS,
  type DemandLevel,
  type SupplyLevel,
} from "@/lib/agri/types";

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SupplyBadge({ value }: { value: SupplyLevel }) {
  return (
    <Pill
      className={
        value === "low"
          ? "bg-danger/10 text-danger"
          : value === "high"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
      }
    >
      {SUPPLY_LABELS[value]}
    </Pill>
  );
}

export function DemandBadge({ value }: { value: DemandLevel }) {
  return (
    <Pill
      className={
        value === "high"
          ? "bg-primary/10 text-primary"
          : value === "low"
            ? "bg-danger/10 text-danger"
            : "bg-muted text-muted-foreground"
      }
    >
      {DEMAND_LABELS[value]}
    </Pill>
  );
}

export function PressureBadge({ label }: { label: PressureLabel | null }) {
  if (!label) return <span className="text-muted-foreground text-xs">—</span>;
  const buying = label.includes("Buying");
  const selling = label.includes("Selling");
  return (
    <Pill
      className={
        buying
          ? "bg-primary/12 text-primary"
          : selling
            ? "bg-danger/12 text-danger"
            : "bg-muted text-muted-foreground"
      }
    >
      {label}
    </Pill>
  );
}

export function SeasonBadge({ status }: { status: SeasonStatus }) {
  const tone: Record<SeasonStatus, string> = {
    Harvesting: "bg-harvest/20 text-harvest",
    "Peak Supply": "bg-peak-supply/20 text-peak-supply",
    "Lean Supply": "bg-lean/20 text-lean",
    Planting: "bg-planting/15 text-planting",
    Growing: "bg-growing/25 text-lean",
    "Off Season": "bg-muted text-muted-foreground",
    "No Season Data": "bg-muted text-muted-foreground",
  };
  return <Pill className={tone[status]}>{status}</Pill>;
}

export function ChangeText({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value))
    return <span className="text-muted-foreground">—</span>;
  const sign = value > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        value > 0 ? "text-primary" : value < 0 ? "text-danger" : "text-muted-foreground",
      )}
    >
      {sign}
      {value.toFixed(1)}%
    </span>
  );
}