import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveNote, todayISO, useDb } from "@/lib/agri/store";
import { REASON_TAGS, reasonTagLabel } from "@/lib/agri/types";
import type { Direction, Impact, Note } from "@/lib/agri/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | undefined;
  defaultGoodId?: string | undefined;
  defaultDate?: string | undefined;
}

export function NoteFormDialog({ open, onOpenChange, note, defaultGoodId, defaultDate }: Props) {
  const db = useDb();
  const goods = useMemo(
    () => db.goods.filter((g) => !g.archived || g.id === note?.goodId),
    [db.goods, note?.goodId],
  );

  const [goodId, setGoodId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [direction, setDirection] = useState<Direction>("neutral");
  const [reasonTag, setReasonTag] = useState<string>("other");
  const [impact, setImpact] = useState<Impact>("medium");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setGoodId(note?.goodId ?? defaultGoodId ?? goods[0]?.id ?? "");
    setDate(note?.date ?? defaultDate ?? todayISO());
    setDirection(note?.direction ?? "neutral");
    setReasonTag(note?.reasonTag ?? "other");
    setImpact(note?.impact ?? "medium");
    setText(note?.text ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, note, defaultGoodId, defaultDate]);

  function submit() {
    if (!goodId) return setError("Please choose a good");
    if (!date) return setError("Date is required");
    if (!text.trim()) return setError("Note text is required");

    saveNote({
      ...(note ? { id: note.id } : {}),
      goodId,
      date,
      direction,
      reasonTag,
      impact,
      text: text.trim(),
    });
    toast.success(note ? "Note updated" : "Note added");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{note ? "Edit Note" : "Add Note"}</DialogTitle>
        </DialogHeader>

        {goods.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add a good first, then write notes.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Good *</Label>
              <Select value={goodId} onValueChange={setGoodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select good" />
                </SelectTrigger>
                <SelectContent>
                  {goods.map((good) => (
                    <SelectItem key={good.id} value={good.id}>
                      {good.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note-date">Date *</Label>
              <Input
                id="note-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Direction *</Label>
              <Select value={direction} onValueChange={(value) => setDirection(value as Direction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Price Up</SelectItem>
                  <SelectItem value="down">Price Down</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason Tag *</Label>
              <Select value={reasonTag} onValueChange={setReasonTag}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {REASON_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {reasonTagLabel(tag)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Impact</Label>
              <Select value={impact} onValueChange={(value) => setImpact(value as Impact)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note-text">Note *</Label>
              <Textarea
                id="note-text"
                rows={4}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="What moved the price?"
              />
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={goods.length === 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}