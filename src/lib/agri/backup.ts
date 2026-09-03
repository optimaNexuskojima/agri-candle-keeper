import type { AgriDatabase } from "./types";

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportJson(db: AgriDatabase) {
  const payload = { ...db, exportedAt: new Date().toISOString() };
  downloadFile("agri-candle-backup.json", JSON.stringify(payload, null, 2), "application/json");
}

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}

export function exportGoodsCsv(db: AgriDatabase) {
  const csv = toCsv(
    ["Name", "Category", "Unit", "Grade", "Market/Location", "Currency", "Archived"],
    db.goods.map((g) => [
      g.name,
      g.category,
      g.unit,
      g.grade,
      g.marketLocation,
      g.currency,
      g.archived ? "yes" : "no",
    ]),
  );
  downloadFile("goods.csv", csv, "text/csv");
}

export function exportPricesCsv(db: AgriDatabase) {
  const nameById = new Map(db.goods.map((g) => [g.id, g.name]));
  const rows = [...db.prices]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => [
      nameById.get(p.goodId) ?? "Unknown",
      p.date,
      p.open,
      p.high,
      p.low,
      p.close,
      p.supply,
      p.demand,
      p.stockLevel,
      p.volumeEstimate,
      p.source,
    ]);
  const csv = toCsv(
    [
      "Good Name",
      "Date",
      "Open",
      "High",
      "Low",
      "Close",
      "Supply",
      "Demand",
      "Stock Level",
      "Volume Estimate",
      "Source",
    ],
    rows,
  );
  downloadFile("prices.csv", csv, "text/csv");
}

export function exportNotesCsv(db: AgriDatabase) {
  const nameById = new Map(db.goods.map((g) => [g.id, g.name]));
  const rows = [...db.notes]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((n) => [
      nameById.get(n.goodId) ?? "Unknown",
      n.date,
      n.direction,
      n.reasonTag,
      n.impact,
      n.text,
    ]);
  downloadFile(
    "notes.csv",
    toCsv(["Good Name", "Date", "Direction", "Reason Tag", "Impact", "Note"], rows),
    "text/csv",
  );
}

export function parseBackup(raw: string): AgriDatabase | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AgriDatabase>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.goods)) return null;
    return {
      goods: parsed.goods,
      prices: Array.isArray(parsed.prices) ? parsed.prices : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      seasons: Array.isArray(parsed.seasons) ? parsed.seasons : [],
    };
  } catch {
    return null;
  }
}
