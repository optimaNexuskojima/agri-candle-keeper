import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { saveGood } from "@/lib/agri/store";
import type { Good } from "@/lib/agri/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  good?: Good | undefined;
  onSaved?: (good: Good) => void;
}

export function GoodFormDialog({ open, onOpenChange, good, onSaved }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("kg");
  const [grade, setGrade] = useState("");
  const [marketLocation, setMarketLocation] = useState("");
  const [currency, setCurrency] = useState("MMK");
  const [archived, setArchived] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; unit?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName(good?.name ?? "");
    setCategory(good?.category ?? "");
    setUnit(good?.unit ?? "kg");
    setGrade(good?.grade ?? "");
    setMarketLocation(good?.marketLocation ?? "");
    setCurrency(good?.currency ?? "MMK");
    setArchived(good?.archived ?? false);
    setErrors({});
  }, [open, good]);

  function submit() {
    const nextErrors: { name?: string; unit?: string } = {};
    if (!name.trim()) nextErrors.name = "Name is required";
    if (!unit.trim()) nextErrors.unit = "Unit is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const saved = saveGood({
      ...(good ? { id: good.id } : {}),
      name: name.trim(),
      category: category.trim() || undefined,
      unit: unit.trim(),
      grade: grade.trim() || undefined,
      marketLocation: marketLocation.trim() || undefined,
      currency: currency.trim() || "MMK",
      archived,
    });
    toast.success(good ? "Good updated" : "Good added");
    onSaved?.(saved);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{good ? "Edit Good" : "Add Good"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="good-name">Name *</Label>
            <Input
              id="good-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Sesame"
              maxLength={80}
            />
            {errors.name && <p className="text-danger text-xs">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="good-category">Category</Label>
            <Input
              id="good-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. Pulses"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="good-unit">Unit *</Label>
              <Input
                id="good-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="kg"
              />
              {errors.unit && <p className="text-danger text-xs">{errors.unit}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="good-currency">Currency</Label>
              <Input
                id="good-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                placeholder="MMK"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="good-grade">Grade</Label>
            <Input
              id="good-grade"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder="e.g. FAQ"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="good-market">Market / Location</Label>
            <Input
              id="good-market"
              value={marketLocation}
              onChange={(event) => setMarketLocation(event.target.value)}
              placeholder="e.g. Mandalay"
            />
          </div>
          {good && (
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Archived</p>
                <p className="text-muted-foreground text-xs">Hide from the active goods list</p>
              </div>
              <Switch checked={archived} onCheckedChange={setArchived} />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}