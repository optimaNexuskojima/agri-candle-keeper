import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DemandBadge, PressureBadge, SupplyBadge } from "@/components/agri/badges";
import {
  changePercent,
  formatPercent,
  formatPrice,
  pressureForDate,
  sortedPrices,
} from "@/lib/agri/logic";
import { useDb } from "@/lib/agri/store";
import { reasonTagLabel, type Good } from "@/lib/agri/types";

interface Props {
  good: Good;
  date: string | null;
  onOpenChange: (open: boolean) => void;
  onAddNote: (date: string) => void;
  onEditPrice: (date: string) => void;
}

export function CandleDetailDialog({ good, date, onOpenChange, onAddNote, onEditPrice }: Props) {
  const db = useDb();
  const list = sortedPrices(db.prices, good.id);
  const index = date ? list.findIndex((p) => p.date === date) : -1;
  const entry = index >= 0 ? list[index] : undefined;
  const previous = index > 0 ? list[index - 1] : undefined;
  const pressure = date ? pressureForDate(db, good.id, date) : null;
  const notes = db.notes.filter((n) => n.goodId === good.id && n.date === date);
  const change = entry && previous ? changePercent(entry.close, previous.close) : null;

  return (
    <Dialog open={Boolean(date && entry)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{date}</DialogTitle>
          <DialogDescription>
            {good.name} · per {good.unit}
          </DialogDescription>
        </DialogHeader>

        {entry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Open" value={formatPrice(entry.open)} />
              <Field label="Close" value={formatPrice(entry.close, good.currency)} />
              <Field label="High" value={formatPrice(entry.high)} />
              <Field label="Low" value={formatPrice(entry.low)} />
              <Field label="Change vs previous close" value={formatPercent(change)} />
              <Field label="Pressure score" value={pressure ? String(pressure.score) : "—"} />
            </div>

            <div className="flex flex-wrap gap-2">
              <SupplyBadge value={entry.supply} />
              <DemandBadge value={entry.demand} />
              <PressureBadge label={pressure?.label ?? null} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Notes</p>
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No notes for this date.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-muted/50 rounded-xl p-3">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="text-foreground font-semibold">
                        {reasonTagLabel(note.reasonTag)}
                      </span>
                      <span>· {note.direction}</span>
                      <span>· {note.impact} impact</span>
                    </div>
                    <p className="mt-1 text-sm break-words">{note.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => onAddNote(entry.date)}>
                <Plus className="size-4" /> Add Note
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onEditPrice(entry.date)}>
                <Pencil className="size-4" /> Edit Price
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-xl px-3 py-2">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}