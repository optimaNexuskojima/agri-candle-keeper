import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Flame, Layers, Leaf, Sprout } from "lucide-react";

import { GoodIcon } from "@/components/agri/GoodIcon";
import { CommodityCard } from "@/components/agri/CommodityCard";
import { PressureGauge } from "@/components/agri/PressureGauge";
import { EmptyGoods } from "@/components/agri/EmptyGoods";
import { computeGoodStats, formatPercent, sortedPrices, type GoodStats } from "@/lib/agri/logic";
import { useDb } from "@/lib/agri/store";
import { useFavorites } from "@/lib/agri/favorites";
import { cn } from "@/lib/utils";

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

const CATEGORY_ICONS = [Layers, Leaf, Sprout, Flame];

function Dashboard() {
  const db = useDb();
  const month = new Date().getMonth() + 1;
  const { isFavorite, toggle } = useFavorites();
  const [category, setCategory] = useState("All");

  const stats = useMemo(
    () =>
      db.goods
        .filter((good) => !good.archived)
        .map((good) => computeGoodStats(db, good))
        .sort((a, b) => (b.pressureScore ?? -9) - (a.pressureScore ?? -9)),
    [db],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    stats.forEach((s) => set.add(s.good.category ?? "Uncategorised"));
    return ["All", ...Array.from(set).sort()];
  }, [stats]);

  const visible = useMemo(
    () =>
      category === "All"
        ? stats
        : stats.filter((s) => (s.good.category ?? "Uncategorised") === category),
    [stats, category],
  );

  const closesFor = (goodId: string) =>
    sortedPrices(db.prices, goodId)
      .slice(-14)
      .map((entry) => entry.close);

  const notesCountFor = (goodId: string) => db.notes.filter((n) => n.goodId === goodId).length;

  if (db.goods.length === 0) return <EmptyGoods />;

  const movers = [...stats]
    .filter((s) => s.dailyChange !== null)
    .sort((a, b) => Math.abs(b.dailyChange ?? 0) - Math.abs(a.dailyChange ?? 0))
    .slice(0, 6);

  const strongBuying = stats.filter((s) => (s.pressureScore ?? 0) >= 3);
  const strongSelling = stats.filter((s) => (s.pressureScore ?? 0) <= -3);
  const lowSupplyHighDemand = stats.filter(
    (s) => s.latest?.supply === "low" && s.latest?.demand === "high",
  );
  const harvesting = stats.filter((s) => s.season?.harvestMonths.includes(month));
  const lean = stats.filter((s) => s.season?.leanMonths.includes(month));
  const topScore = stats[0]?.pressureScore ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground text-sm">Today's market pressure across your goods.</p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {categories.map((name, index) => {
          const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]!;
          const active = category === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={cn(
                "border-border inline-flex shrink-0 items-center gap-2 rounded-full border py-2 pr-4 pl-2 text-sm font-semibold",
                active
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-card text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full",
                  active ? "bg-white/20" : "bg-elevated",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              {name}
            </button>
          );
        })}
      </div>

      <section className="pm-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="pm-label">Live · Today's moves</p>
          <span className="bg-success/12 text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
            <span className="bg-success size-1.5 animate-pulse rounded-full" /> LIVE
          </span>
        </div>
        {movers.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No price moves logged yet.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {movers.map((row) => {
              const up = (row.dailyChange ?? 0) >= 0;
              return (
                <li key={row.good.id}>
                  <Link
                    to="/goods/$goodId"
                    params={{ goodId: row.good.id }}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <GoodIcon name={row.good.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{row.good.name}</p>
                      <p className="pm-label">{row.latest?.date ?? "—"}</p>
                    </div>
                    <span
                      className={cn(
                        "pm-num inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        up ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
                      )}
                    >
                      {up ? (
                        <ArrowUpRight className="size-3.5" />
                      ) : (
                        <ArrowDownRight className="size-3.5" />
                      )}
                      {formatPercent(row.dailyChange)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="pm-card p-4">
        <p className="pm-label mb-3">Market pressure · Top good</p>
        <PressureGauge score={topScore} />
        <p className="text-muted-foreground mt-3 text-center text-xs">
          {stats[0]?.good.name ?? "—"} · score {topScore ?? "—"}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard title="Strong Buying" items={strongBuying} tone="up" />
        <SummaryCard title="Strong Selling" items={strongSelling} tone="down" />
        <SummaryCard title="Low Supply + High Demand" items={lowSupplyHighDemand} tone="up" />
        <SummaryCard title="Harvest This Month" items={harvesting} tone="neutral" />
        <SummaryCard title="Lean Supply This Month" items={lean} tone="neutral" />
      </div>

      <div className="space-y-3">
        <p className="pm-label">Opportunity board</p>
        {visible.map((row) => (
          <CommodityCard
            key={row.good.id}
            stats={row}
            closes={closesFor(row.good.id)}
            notesCount={notesCountFor(row.good.id)}
            favorite={isFavorite(row.good.id)}
            onToggleFavorite={() => toggle(row.good.id)}
          />
        ))}
        {visible.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No goods in this category.
          </p>
        )}
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
    tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-foreground";
  return (
    <div className="pm-card p-4">
      <p className="pm-label">{title}</p>
      <p className={`pm-num mt-1 text-3xl font-bold ${toneClass}`}>{items.length}</p>
      <div className="mt-1 space-y-0.5">
        {items.slice(0, 3).map((item) => (
          <Link
            key={item.good.id}
            to="/goods/$goodId"
            params={{ goodId: item.good.id }}
            className="text-muted-foreground block truncate text-xs font-medium"
          >
            {item.good.name}
          </Link>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-xs">None right now</p>}
      </div>
    </div>
  );
}
