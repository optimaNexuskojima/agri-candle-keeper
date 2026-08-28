import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GoodFormDialog } from "@/components/agri/GoodFormDialog";
import { DemandBadge, PressureBadge, SupplyBadge } from "@/components/agri/badges";
import { CommodityCard } from "@/components/agri/CommodityCard";
import { useFavorites } from "@/lib/agri/favorites";
import { computeGoodStats, sortedPrices } from "@/lib/agri/logic";
import { useDb } from "@/lib/agri/store";
import { EmptyGoods } from "@/components/agri/EmptyGoods";

export const Route = createFileRoute("/goods/")({
  head: () => ({
    meta: [
      { title: "Goods — AgriCandle Commodity Tracker" },
      {
        name: "description",
        content:
          "Manage your tracked agricultural commodities: prices, supply, demand and pressure at a glance.",
      },
      { property: "og:title", content: "Goods — AgriCandle" },
      {
        property: "og:description",
        content: "Track beans, pulses, sesame and more with offline price history.",
      },
    ],
  }),
  component: GoodsPage,
});

function GoodsPage() {
  const db = useDb();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return db.goods
      .filter((good) => (showArchived ? true : !good.archived))
      .filter((good) =>
        term
          ? good.name.toLowerCase().includes(term) ||
            (good.category ?? "").toLowerCase().includes(term)
          : true,
      )
      .map((good) => computeGoodStats(db, good))
      .sort((a, b) => a.good.name.localeCompare(b.good.name));
  }, [db, search, showArchived]);

  if (db.goods.length === 0) return <EmptyGoods />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Goods</h1>
        <Button onClick={() => setFormOpen(true)} className="h-11">
          <Plus className="size-4" /> Add Good
        </Button>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search goods"
          className="h-11 pl-9"
        />
      </div>

      <div className="pm-card flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">Show archived goods</span>
        <Switch checked={showArchived} onCheckedChange={setShowArchived} />
      </div>

      <ul className="space-y-3">
        {rows.map((stats) => (
          <li key={stats.good.id} className="space-y-2">
            <CommodityCard
              stats={stats}
              closes={sortedPrices(db.prices, stats.good.id)
                .slice(-14)
                .map((entry) => entry.close)}
              notesCount={db.notes.filter((n) => n.goodId === stats.good.id).length}
              favorite={isFavorite(stats.good.id)}
              onToggleFavorite={() => toggleFavorite(stats.good.id)}
            />
            <div className="flex flex-wrap gap-1.5 px-1">
              {stats.latest && <SupplyBadge value={stats.latest.supply} />}
              {stats.latest && <DemandBadge value={stats.latest.demand} />}
              <PressureBadge label={stats.pressure} />
              {stats.good.archived && (
                <span className="bg-elevated text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  Archived
                </span>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-muted-foreground py-8 text-center text-sm">No goods match.</li>
        )}
      </ul>


      <GoodFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}