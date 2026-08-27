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
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
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
          ? "bg-danger/12 text-danger"
          : value === "high"
            ? "bg-success/12 text-success"
            : "bg-elevated text-muted-foreground"
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
          ? "bg-success/12 text-success"
          : value === "low"
            ? "bg-danger/12 text-danger"
            : "bg-elevated text-muted-foreground"
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
          ? "bg-success/12 text-success"
          : selling
            ? "bg-danger/12 text-danger"
            : "bg-elevated text-muted-foreground"
      }
    >
      {label}
    </Pill>
  );
}

export function SeasonBadge({ status }: { status: SeasonStatus }) {
  const tone: Record<SeasonStatus, string> = {
    Harvesting: "bg-warning/15 text-warning",
    "Peak Supply": "bg-warning/15 text-warning",
    "Lean Supply": "bg-danger/12 text-danger",
    Planting: "bg-primary/15 text-primary",
    Growing: "bg-success/12 text-success",
    "Off Season": "bg-elevated text-muted-foreground",
    "No Season Data": "bg-elevated text-muted-foreground",
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
        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted-foreground",
      )}
    >
      {sign}
      {value.toFixed(1)}%
    </span>
  );
}
