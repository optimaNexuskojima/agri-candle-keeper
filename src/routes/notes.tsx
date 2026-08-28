import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteFormDialog } from "@/components/agri/NoteFormDialog";
import { deleteNote, useDb } from "@/lib/agri/store";
import { REASON_TAGS, reasonTagLabel, type Note } from "@/lib/agri/types";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Market Notes — AgriCandle" },
      {
        name: "description",
        content:
          "Why did the price move? Keep dated notes with reason tags like harvest arrival, export demand or low supply.",
      },
      { property: "og:title", content: "Market Notes — AgriCandle" },
      {
        property: "og:description",
        content: "Reason-tagged notes explaining each price move, stored offline on your device.",
      },
    ],
  }),
  component: NotesPage,
});

function DirectionIcon({ direction }: { direction: Note["direction"] }) {
  if (direction === "up") return <ArrowUpRight className="text-success size-4" />;
  if (direction === "down") return <ArrowDownRight className="text-danger size-4" />;
  return <Minus className="text-muted-foreground size-4" />;
}

function NotesPage() {
  const db = useDb();
  const [goodFilter, setGoodFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; note?: Note }>({ open: false });

  const nameById = useMemo(() => new Map(db.goods.map((g) => [g.id, g.name])), [db.goods]);
  const notes = useMemo(
    () =>
      db.notes
        .filter((note) => (goodFilter === "all" ? true : note.goodId === goodFilter))
        .filter((note) => (tagFilter === "all" ? true : note.reasonTag === tagFilter))
        .filter((note) => (directionFilter === "all" ? true : note.direction === directionFilter))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.notes, goodFilter, tagFilter, directionFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <Button className="h-11" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Add Note
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Select value={goodFilter} onValueChange={setGoodFilter}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All goods</SelectItem>
            {db.goods.map((good) => (
              <SelectItem key={good.id} value={good.id}>
                {good.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All reasons</SelectItem>
            {REASON_TAGS.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {reasonTagLabel(tag)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moves</SelectItem>
            <SelectItem value="up">Price Up</SelectItem>
            <SelectItem value="down">Price Down</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {notes.length === 0 ? (
        <div className="ios-card px-6 py-10 text-center">
          <p className="font-semibold">No notes yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Write down why prices moved so you can spot the pattern later.
          </p>
          <Button className="mt-4 h-11" onClick={() => setDialog({ open: true })}>
            <Plus className="size-4" /> Add Note
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="ios-card p-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDialog({ open: true, note })}
                >
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                    <DirectionIcon direction={note.direction} />
                    <span className="text-foreground font-semibold">{note.date}</span>
                    <span>· {nameById.get(note.goodId) ?? "Unknown good"}</span>
                    <span>· {reasonTagLabel(note.reasonTag)}</span>
                    <span>· {note.impact} impact</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm break-words">{note.text}</p>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-danger"
                  aria-label="Delete note"
                  onClick={() => {
                    deleteNote(note.id);
                    toast.success("Note deleted");
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <NoteFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog(open ? { ...dialog, open } : { open: false })}
        note={dialog.note}
      />
    </div>
  );
}