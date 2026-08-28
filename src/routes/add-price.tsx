import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyGoods } from "@/components/agri/EmptyGoods";
import { PriceFormDialog } from "@/components/agri/PriceFormDialog";
import { DemandBadge, SupplyBadge } from "@/components/agri/badges";
import { formatPrice } from "@/lib/agri/logic";
import { useDb } from "@/lib/agri/store";
import type { PriceEntry } from "@/lib/agri/types";

export const Route = createFileRoute("/add-price")({
  head: () => ({
    meta: [
      { title: "Add Price — AgriCandle" },
      {
        name: "description",
        content:
          "Record today's close, open, high, low, supply and demand for any commodity you track.",
      },
      { property: "og:title", content: "Add Price — AgriCandle" },
      {
        property: "og:description",
        content: "Log daily commodity prices offline, one entry per good per day.",
      },
    ],
  }),
  component: AddPricePage,
});

function AddPricePage() {
  const db = useDb();
  const [dialog, setDialog] = useState<{ open: boolean; price?: PriceEntry }>({ open: true });

  const recent = useMemo(
    () =>
      [...db.prices]
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 15),
    [db.prices],
  );
  const nameById = useMemo(() => new Map(db.goods.map((g) => [g.id, g.name])), [db.goods]);

  if (db.goods.length === 0) return <EmptyGoods />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Add Price</h1>
        <Button className="h-11" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> New Entry
        </Button>
      </div>

      <div className="pm-card p-3">
        <p className="mb-2 font-semibold">Recent Entries</p>
        {recent.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No prices yet.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 py-3 text-left"
                  onClick={() => setDialog({ open: true, price: entry })}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {nameById.get(entry.goodId) ?? "Unknown good"}
                    </p>
                    <p className="text-muted-foreground text-xs">{entry.date}</p>
                    <div className="mt-1 flex gap-1.5">
                      <SupplyBadge value={entry.supply} />
                      <DemandBadge value={entry.demand} />
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{formatPrice(entry.close)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PriceFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog(open ? { ...dialog, open } : { open: false })}
        price={dialog.price}
      />
    </div>
  );
}