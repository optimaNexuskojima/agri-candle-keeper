import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChangeText,
  DemandBadge,
  PressureBadge,
  SeasonBadge,
  SupplyBadge,
} from "@/components/agri/badges";
import { CandleDetailDialog } from "@/components/agri/CandleDetailDialog";
import { GoodFormDialog } from "@/components/agri/GoodFormDialog";
import { NoteFormDialog } from "@/components/agri/NoteFormDialog";
import { PriceChart, type ChartMode } from "@/components/agri/PriceChart";
import { PriceFormDialog } from "@/components/agri/PriceFormDialog";
import { SeasonEditor } from "@/components/agri/SeasonEditor";
import { computeGoodStats, formatPrice, seasonAlerts, sortedPrices } from "@/lib/agri/logic";
import { deleteGood, deletePrice, setGoodArchived, useDb } from "@/lib/agri/store";
import { STOCK_LABELS, reasonTagLabel, type PriceEntry } from "@/lib/agri/types";

export const Route = createFileRoute("/goods/$goodId")({
  head: () => ({
    meta: [
      { title: "Good Detail — AgriCandle" },
      {
        name: "description",
        content:
          "Analyse one commodity: candlestick chart, price history, market notes and season calendar.",
      },
      { property: "og:title", content: "Good Detail — AgriCandle" },
      {
        property: "og:description",
        content: "Candles, notes, supply and demand pressure for a single commodity.",
      },
    ],
  }),
  component: GoodDetailPage,
});

const RANGES = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "all", label: "All" },
];

function GoodDetailPage() {
  const { goodId } = Route.useParams();
  const db = useDb();
  const navigate = useNavigate();
  const good = db.goods.find((g) => g.id === goodId);

  const [range, setRange] = useState("30");
  const [chartMode, setChartMode] = useState<ChartMode>("auto");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [priceDialog, setPriceDialog] = useState<{ open: boolean; price?: PriceEntry; date?: string }>(
    { open: false },
  );
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; date?: string }>({ open: false });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const entries = useMemo(() => (good ? sortedPrices(db.prices, good.id) : []), [db.prices, good]);
  const visibleEntries = useMemo(() => {
    if (range === "all") return entries;
    return entries.slice(-Number(range));
  }, [entries, range]);
  const noteDates = useMemo(
    () => new Set(db.notes.filter((n) => n.goodId === goodId).map((n) => n.date)),
    [db.notes, goodId],
  );

  if (!good) {
    return (
      <div className="ios-card px-6 py-10 text-center">
        <p className="font-semibold">This good was not found.</p>
        <Link to="/goods" className="text-primary mt-3 inline-block text-sm">
          Back to goods
        </Link>
      </div>
    );
  }

  const stats = computeGoodStats(db, good);
  const alerts = seasonAlerts(stats.season);
  const goodNotes = db.notes
    .filter((n) => n.goodId === good.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <Link to="/goods" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Goods
      </Link>

      <div className="pm-card space-y-4 p-4">
        <div className="flex items-start gap-3">
          <GoodIcon name={good.name} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{good.name}</h1>
            <p className="text-muted-foreground truncate text-xs">
              {good.category ?? "Uncategorised"} · per {good.unit} · {good.currency}
              {good.marketLocation ? ` · ${good.marketLocation}` : ""}
            </p>
          </div>
        </div>

        <div>
          <p className="pm-num text-4xl font-bold tracking-tight">
            {formatPrice(stats.latest?.close, good.currency)}
          </p>
          <p className="mt-1 text-sm">
            <ChangeText value={stats.dailyChange} />{" "}
            <span className="text-muted-foreground">today · per {good.unit}</span>
          </p>
        </div>

        <PressureGauge score={stats.pressureScore} />

        <div className="flex flex-wrap gap-1.5">
          {stats.latest && <SupplyBadge value={stats.latest.supply} />}
          {stats.latest && <DemandBadge value={stats.latest.demand} />}
          <PressureBadge label={stats.pressure} />
          <SeasonBadge status={stats.seasonStatus} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-elevated rounded-xl py-2.5">
            <p className="pm-label">3D</p>
            <ChangeText value={stats.change3d} />
          </div>
          <div className="bg-elevated rounded-xl py-2.5">
            <p className="pm-label">7D</p>
            <ChangeText value={stats.change7d} />
          </div>
          <div className="bg-elevated rounded-xl py-2.5">
            <p className="pm-label">Pressure</p>
            <p className="pm-num font-semibold">{stats.pressureScore ?? "—"}</p>
          </div>
        </div>


        {alerts.length > 0 && (
          <ul className="space-y-1">
            {alerts.map((alert) => (
              <li key={alert} className="bg-harvest/15 rounded-xl px-3 py-2 text-xs font-medium">
                {alert}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11" onClick={() => setPriceDialog({ open: true })}>
            <Plus className="size-4" /> Add Price
          </Button>
          <Button variant="outline" className="h-11" onClick={() => setNoteDialog({ open: true })}>
            <Plus className="size-4" /> Add Note
          </Button>
          <Button variant="outline" className="h-11" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit Good
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              setGoodArchived(good.id, !good.archived);
              toast.success(good.archived ? "Good restored" : "Good archived");
            }}
          >
            <Archive className="size-4" /> {good.archived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            variant="destructive"
            className="col-span-2 h-11"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" /> Delete Good
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chart">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="season">Season</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="ios-card mt-3 space-y-3 p-3">
          <div className="flex gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-10 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={chartMode} onValueChange={(value) => setChartMode(value as ChartMode)}>
              <SelectTrigger className="h-10 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="candles">Candles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PriceChart
            entries={visibleEntries}
            noteDates={noteDates}
            mode={chartMode}
            onSelect={setSelectedDate}
          />
          <p className="text-muted-foreground text-xs">
            Tap a candle or point to see details and notes for that day.
          </p>
        </TabsContent>

        <TabsContent value="history" className="ios-card mt-3 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Price History</p>
            <Button size="sm" onClick={() => setPriceDialog({ open: true })}>
              <Plus className="size-4" /> Add Price
            </Button>
          </div>
          {entries.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No prices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Close</th>
                    <th className="py-2 pr-3">Open</th>
                    <th className="py-2 pr-3">High</th>
                    <th className="py-2 pr-3">Low</th>
                    <th className="py-2 pr-3">Supply</th>
                    <th className="py-2 pr-3">Demand</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...entries]
                    .reverse()
                    .map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="py-2 pr-3 whitespace-nowrap">{entry.date}</td>
                        <td className="py-2 pr-3 font-semibold tabular-nums">{entry.close}</td>
                        <td className="py-2 pr-3 tabular-nums">{entry.open ?? "—"}</td>
                        <td className="py-2 pr-3 tabular-nums">{entry.high ?? "—"}</td>
                        <td className="py-2 pr-3 tabular-nums">{entry.low ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <SupplyBadge value={entry.supply} />
                        </td>
                        <td className="py-2 pr-3">
                          <DemandBadge value={entry.demand} />
                        </td>
                        <td className="text-muted-foreground py-2 pr-3">
                          {entry.source ?? "—"}
                          {entry.stockLevel ? ` · ${STOCK_LABELS[entry.stockLevel]}` : ""}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPriceDialog({ open: true, price: entry })}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger"
                              onClick={() => {
                                deletePrice(entry.id);
                                toast.success("Price deleted");
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="ios-card mt-3 space-y-3 p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Notes</p>
            <Button size="sm" onClick={() => setNoteDialog({ open: true })}>
              <Plus className="size-4" /> Add Note
            </Button>
          </div>
          {goodNotes.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No notes yet.</p>
          ) : (
            goodNotes.map((note) => (
              <div key={note.id} className="bg-muted/40 rounded-xl p-3">
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-foreground font-semibold">{note.date}</span>
                  <span>· {reasonTagLabel(note.reasonTag)}</span>
                  <span>· {note.direction}</span>
                  <span>· {note.impact} impact</span>
                </div>
                <p className="mt-1 text-sm break-words">{note.text}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="season" className="ios-card mt-3 p-4">
          <SeasonEditor goodId={good.id} />
        </TabsContent>
      </Tabs>

      <CandleDetailDialog
        good={good}
        date={selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        onAddNote={(date) => {
          setSelectedDate(null);
          setNoteDialog({ open: true, date });
        }}
        onEditPrice={(date) => {
          const entry = entries.find((e) => e.date === date);
          setSelectedDate(null);
          setPriceDialog({ open: true, ...(entry ? { price: entry } : { date }) });
        }}
      />

      <PriceFormDialog
        open={priceDialog.open}
        onOpenChange={(open) => setPriceDialog(open ? { ...priceDialog, open } : { open: false })}
        price={priceDialog.price}
        defaultGoodId={good.id}
        defaultDate={priceDialog.date}
      />

      <NoteFormDialog
        open={noteDialog.open}
        onOpenChange={(open) => setNoteDialog(open ? { ...noteDialog, open } : { open: false })}
        defaultGoodId={good.id}
        defaultDate={noteDialog.date}
      />

      <GoodFormDialog open={editOpen} onOpenChange={setEditOpen} good={good} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {good.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {entries.length > 0
                ? `This good has ${entries.length} price entries. Archiving keeps your history — deleting removes prices, notes and season data permanently.`
                : "This will permanently remove the good."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {entries.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setGoodArchived(good.id, true);
                  setDeleteOpen(false);
                  toast.success("Good archived instead");
                }}
              >
                Archive instead
              </Button>
            )}
            <AlertDialogAction
              onClick={() => {
                deleteGood(good.id);
                toast.success("Good deleted");
                navigate({ to: "/goods" });
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}