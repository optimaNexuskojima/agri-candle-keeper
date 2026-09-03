export type SupplyLevel = "high" | "normal" | "low";
export type DemandLevel = "low" | "normal" | "high";
export type StockLevel = "low" | "normal" | "high";
export type Direction = "up" | "down" | "neutral";
export type Impact = "low" | "medium" | "high";

/**
 * Sync bookkeeping carried by every record.
 * `updatedAt` drives last-write-wins conflict resolution; `deletedAt` marks a
 * tombstone so deletions propagate between devices instead of resurrecting.
 */
export interface SyncMeta {
  updatedAt?: string | undefined;
  deletedAt?: string | null | undefined;
}

export interface Good extends SyncMeta {
  id: string;
  name: string;
  category?: string | undefined;
  unit: string;
  grade?: string | undefined;
  marketLocation?: string | undefined;
  currency: string;
  archived: boolean;
  createdAt: string;
}

export interface PriceEntry extends SyncMeta {
  id: string;
  goodId: string;
  date: string;
  close: number;
  open?: number | undefined;
  high?: number | undefined;
  low?: number | undefined;
  supply: SupplyLevel;
  demand: DemandLevel;
  stockLevel?: StockLevel | undefined;
  volumeEstimate?: number | undefined;
  source?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Note extends SyncMeta {
  id: string;
  goodId: string;
  date: string;
  priceId?: string | undefined;
  direction: Direction;
  reasonTag: string;
  text: string;
  impact: Impact;
  createdAt: string;
}

export interface SeasonProfile extends SyncMeta {
  goodId: string;
  plantingMonths: number[];
  growingMonths: number[];
  harvestMonths: number[];
  peakSupplyMonths: number[];
  leanMonths: number[];
  notes?: string | undefined;
}

export interface AgriDatabase {
  goods: Good[];
  prices: PriceEntry[];
  notes: Note[];
  seasons: SeasonProfile[];
}

export const REASON_TAGS = [
  "harvest_arrival",
  "low_supply",
  "high_demand",
  "export_demand",
  "local_demand",
  "rain",
  "drought",
  "flood",
  "transport_cost",
  "fuel_cost",
  "currency_change",
  "festival_demand",
  "government_policy",
  "import_competition",
  "quality_issue",
  "storage_loss",
  "panic_selling",
  "sellers_holding_stock",
  "buyers_waiting",
  "substitute_price",
  "other",
] as const;

export function reasonTagLabel(tag: string): string {
  return tag
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const SUPPLY_LABELS: Record<SupplyLevel, string> = {
  high: "High Supply",
  normal: "Normal Supply",
  low: "Low Supply",
};

export const DEMAND_LABELS: Record<DemandLevel, string> = {
  low: "Low Demand",
  normal: "Normal Demand",
  high: "High Demand",
};

export const STOCK_LABELS: Record<StockLevel, string> = {
  low: "Low Stock",
  normal: "Normal Stock",
  high: "High Stock",
};

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
