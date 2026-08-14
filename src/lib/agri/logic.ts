import type {
  AgriDatabase,
  DemandLevel,
  Good,
  Note,
  PriceEntry,
  SeasonProfile,
  SupplyLevel,
} from "./types";

export function sortedPrices(prices: PriceEntry[], goodId: string): PriceEntry[] {
  return prices.filter((p) => p.goodId === goodId).sort((a, b) => a.date.localeCompare(b.date));
}

export function latestPrice(prices: PriceEntry[], goodId: string): PriceEntry | undefined {
  const list = sortedPrices(prices, goodId);
  return list[list.length - 1];
}

function daysBetween(laterISO: string, earlierISO: string): number {
  const later = new Date(`${laterISO}T00:00:00`).getTime();
  const earlier = new Date(`${earlierISO}T00:00:00`).getTime();
  return Math.round((later - earlier) / 86_400_000);
}

/** Closest previous entry at least `minDays` calendar days earlier. */
export function previousEntryAtLeast(
  list: PriceEntry[],
  fromIndex: number,
  minDays: number,
): PriceEntry | undefined {
  const current = list[fromIndex];
  if (!current) return undefined;
  for (let i = fromIndex - 1; i >= 0; i -= 1) {
    const candidate = list[i]!;
    if (daysBetween(current.date, candidate.date) >= minDays) return candidate;
  }
  return undefined;
}

export function changePercent(latestClose: number, previousClose: number): number | null {
  if (!previousClose) return null;
  return ((latestClose - previousClose) / previousClose) * 100;
}

export function demandScore(demand: DemandLevel): number {
  return demand === "low" ? 1 : demand === "normal" ? 2 : 3;
}

export function supplyTightnessScore(supply: SupplyLevel): number {
  return supply === "high" ? 1 : supply === "normal" ? 2 : 3;
}

export function momentumScore(percent: number | null): number {
  if (percent === null) return 0;
  if (percent > 3) return 2;
  if (percent >= 1) return 1;
  if (percent >= -1) return 0;
  if (percent >= -3) return -1;
  return -2;
}

export type PressureLabel =
  | "Strong Buying Pressure"
  | "Buying Pressure"
  | "Neutral"
  | "Selling Pressure"
  | "Strong Selling Pressure";

export function pressureLabel(score: number): PressureLabel {
  if (score >= 3) return "Strong Buying Pressure";
  if (score >= 1) return "Buying Pressure";
  if (score === 0) return "Neutral";
  if (score <= -3) return "Strong Selling Pressure";
  return "Selling Pressure";
}

export interface GoodStats {
  good: Good;
  latest?: PriceEntry | undefined;
  dailyChange: number | null;
  change3d: number | null;
  change7d: number | null;
  pressureScore: number | null;
  pressure: PressureLabel | null;
  seasonStatus: SeasonStatus;
  season?: SeasonProfile | undefined;
}

export function computeGoodStats(db: AgriDatabase, good: Good): GoodStats {
  const list = sortedPrices(db.prices, good.id);
  const lastIndex = list.length - 1;
  const latest = list[lastIndex];
  const season = db.seasons.find((s) => s.goodId === good.id);
  const seasonStatus = currentSeasonStatus(season);

  if (!latest) {
    return {
      good,
      latest: undefined,
      dailyChange: null,
      change3d: null,
      change7d: null,
      pressureScore: null,
      pressure: null,
      seasonStatus,
      season,
    };
  }

  const prev = list[lastIndex - 1];
  const prev3 = previousEntryAtLeast(list, lastIndex, 3);
  const prev7 = previousEntryAtLeast(list, lastIndex, 7);

  const dailyChange = prev ? changePercent(latest.close, prev.close) : null;
  const change3d = prev3 ? changePercent(latest.close, prev3.close) : null;
  const change7d = prev7 ? changePercent(latest.close, prev7.close) : null;

  const raw =
    demandScore(latest.demand) +
    supplyTightnessScore(latest.supply) +
    momentumScore(change3d) -
    4;
  const score = Math.max(-4, Math.min(4, raw));

  return {
    good,
    latest,
    dailyChange,
    change3d,
    change7d,
    pressureScore: score,
    pressure: pressureLabel(score),
    seasonStatus,
    season,
  };
}

export function pressureForDate(
  db: AgriDatabase,
  goodId: string,
  date: string,
): { score: number; label: PressureLabel } | null {
  const list = sortedPrices(db.prices, goodId);
  const index = list.findIndex((p) => p.date === date);
  if (index < 0) return null;
  const entry = list[index]!;
  const prev3 = previousEntryAtLeast(list, index, 3);
  const percent = prev3 ? changePercent(entry.close, prev3.close) : null;
  const raw =
    demandScore(entry.demand) + supplyTightnessScore(entry.supply) + momentumScore(percent) - 4;
  const score = Math.max(-4, Math.min(4, raw));
  return { score, label: pressureLabel(score) };
}

export type SeasonStatus =
  | "Harvesting"
  | "Peak Supply"
  | "Lean Supply"
  | "Planting"
  | "Growing"
  | "Off Season"
  | "No Season Data";

export function currentSeasonStatus(
  season: SeasonProfile | undefined,
  month = new Date().getMonth() + 1,
): SeasonStatus {
  if (!season) return "No Season Data";
  if (season.harvestMonths.includes(month)) return "Harvesting";
  if (season.peakSupplyMonths.includes(month)) return "Peak Supply";
  if (season.leanMonths.includes(month)) return "Lean Supply";
  if (season.plantingMonths.includes(month)) return "Planting";
  if (season.growingMonths.includes(month)) return "Growing";
  return "Off Season";
}

export function seasonAlerts(season: SeasonProfile | undefined): string[] {
  if (!season) return [];
  const month = new Date().getMonth() + 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  const alerts: string[] = [];
  if (season.harvestMonths.includes(month)) alerts.push("Harvesting now");
  if (season.harvestMonths.includes(nextMonth)) alerts.push("Harvest expected next month");
  if (season.leanMonths.includes(month)) alerts.push("Lean supply period");
  if (season.peakSupplyMonths.includes(month)) alerts.push("Peak supply period");
  return alerts;
}

export function notesForDate(notes: Note[], goodId: string, date: string): Note[] {
  return notes.filter((n) => n.goodId === goodId && n.date === date);
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatPrice(value: number | undefined, currency?: string): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}