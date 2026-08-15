import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import {
  ChangeText,
  DemandBadge,
  PressureBadge,
  SeasonBadge,
  SupplyBadge,
} from "@/components/agri/badges";
import { EmptyGoods } from "@/components/agri/EmptyGoods";
import { computeGoodStats, formatPrice, type GoodStats } from "@/lib/agri/logic";
import { useDb } from "@/lib/agri/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriCandle — Offline Commodity Price Tracker" },
      {
        name: "description",
        content:
          "Track daily prices for beans, pulses, sesame and maize offline. See buying pressure, supply, demand and harvest seasons at a glance.",
      },
      { property: "og:title", content: "AgriCandle — Offline Commodity Price Tracker" },
      {
        property: "og:description",
        content:
          "Daily agricultural commodity prices, candlestick charts and market notes stored on your device.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDb();
  const month = new Date().getMonth() + 1;

  const stats = useMemo(
    () =>
      db.goods
        .filter((good) => !good.archived)
        .map((good) => computeGoodStats(db, good))
        .sort((a, b) => (b.pressureScore ?? -9) - (a.pressureScore ?? -9)),
    [db],
  );

  if (db.goods.length === 0) return <EmptyGoods />;

  const strongBuying = stats.filter((s) => (s.pressureScore ?? 0) >= 3);
  const strongSelling = stats.filter((s) => (s.pressureScore ?? 0) <= -3);
  const lowSupplyHighDemand = stats.filter(
    (s) => s.latest?.supply === "low" && s.latest?.demand === "high",
  );
  const harvesting = stats.filter((s) => s.season?.harvestMonths.includes(month));
  const lean = stats.filter((s) => s.season?.leanMonths.includes(month));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Today's market pressure across your goods.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard title="Strong Buying Pressure" items={strongBuying} tone="up" />
        <SummaryCard title="Strong Selling Pressure" items={strongSelling} tone="down" />
        <SummaryCard title="Low Supply + High Demand" items={lowSupplyHighDemand} tone="up" />
        <SummaryCard title="Harvest This Month" items={harvesting} tone="neutral" />
        <SummaryCard title="Lean Supply This Month" items={lean} tone="neutral" />
      </div>

      <div className="ios-card p-3">
        <p className="mb-2 font-semibold">Opportunity Board</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="py-2 pr-3">Good</th>
                <th className="py-2 pr-3">Latest Price</th>
                <th className="py-2 pr-3">3D</th>
                <th className="py-2 pr-3">7D</th>
                <th className="py-2 pr-3">Supply</th>
                <th className="py-2 pr-3">Demand</th>
                <th className="py-2 pr-3">Pressure</th>
                <th className="py-2 pr-3">Season</th>
                <th className="py-2">Pressure Label</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.good.id} className="border-t">
                  <td className="py-2 pr-3">
                    <Link
                      to="/goods/$goodId"
                      params={{ goodId: row.good.id }}
                      className="text-primary font-semibold"
                    >
                      {row.good.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                    {formatPrice(row.latest?.close, row.good.currency)}
                  </td>
                  <td className="py-2 pr-3">
                    <ChangeText value={row.change3d} />
                  </td>
                  <td className="py-2 pr-3">
                    <ChangeText value={row.change7d} />
                  </td>
                  <td className="py-2 pr-3">
                    {row.latest ? <SupplyBadge value={row.latest.supply} /> : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {row.latest ? <DemandBadge value={row.latest.demand} /> : "—"}
                  </td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">
                    {row.pressureScore ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <SeasonBadge status={row.seasonStatus} />
                  </td>
                  <td className="py-2">
                    <PressureBadge label={row.pressure} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: GoodStats[];
  tone: "up" | "down" | "neutral";
}) {
  const toneClass =
    tone === "up" ? "text-primary" : tone === "down" ? "text-danger" : "text-muted-foreground";
  return (
    <div className="ios-card p-3">
      <p className="text-muted-foreground text-xs font-medium">{title}</p>
      <p className={`text-2xl font-bold ${toneClass}`}>{items.length}</p>
      <div className="mt-1 space-y-0.5">
        {items.slice(0, 3).map((item) => (
          <Link
            key={item.good.id}
            to="/goods/$goodId"
            params={{ goodId: item.good.id }}
            className="block truncate text-xs font-medium"
          >
            {item.good.name}
          </Link>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-xs">None right now</p>}
      </div>
    </div>
  );
}
