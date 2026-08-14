import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { savePrice, todayISO, useDb } from "@/lib/agri/store";
import type { DemandLevel, PriceEntry, StockLevel, SupplyLevel } from "@/lib/agri/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price?: PriceEntry | undefined;
  defaultGoodId?: string | undefined;
  defaultDate?: string | undefined;
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function PriceFormDialog({ open, onOpenChange, price, defaultGoodId, defaultDate }: Props) {
  const db = useDb();
  const goods = useMemo(
    () => db.goods.filter((g) => !g.archived || g.id === price?.goodId),
    [db.goods, price?.goodId],
  );

  const [goodId, setGoodId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [close, setClose] = useState("");
  const [openPrice, setOpenPrice] = useState("");
  const [high, setHigh] = useState("");
  const [low, setLow] = useState("");
  const [supply, setSupply] = useState<SupplyLevel>("normal");
  const [demand, setDemand] = useState<DemandLevel>("normal");
  const [stockLevel, setStockLevel] = useState<StockLevel | "none">("none");
  const [volume, setVolume] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const target = price;
    setGoodId(target?.goodId ?? defaultGoodId ?? goods[0]?.id ?? "");
    setDate(target?.date ?? defaultDate ?? todayISO());
    setClose(target ? String(target.close) : "");
    setOpenPrice(target?.open !== undefined ? String(target.open) : "");
    setHigh(target?.high !== undefined ? String(target.high) : "");
    setLow(target?.low !== undefined ? String(target.low) : "");
    setSupply(target?.supply ?? "normal");
    setDemand(target?.demand ?? "normal");
    setStockLevel(target?.stockLevel ?? "none");
    setVolume(target?.volumeEstimate !== undefined ? String(target.volumeEstimate) : "");
    setSource(target?.source ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, price, defaultGoodId, defaultDate]);

  // When user picks an existing good/date pair, prefill from the existing entry.
  const existing = useMemo(
    () => db.prices.find((p) => p.goodId === goodId && p.date === date && p.id !== price?.id),
    [db.prices, goodId, date, price?.id],
  );

  function submit() {
    if (!goodId) return setError("Please choose a good");
    if (!date) return setError("Date is required");
    const closeValue = numberOrUndefined(close);
    if (closeValue === undefined) return setError("Close price is required and must be a number");

    const openValue = numberOrUndefined(openPrice);
    const highValue = numberOrUndefined(high);
    const lowValue = numberOrUndefined(low);

    savePrice({
      ...(price ? { id: price.id } : {}),
      goodId,
      date,
      close: closeValue,
      ...(openValue !== undefined ? { open: openValue } : {}),
      ...(highValue !== undefined ? { high: highValue } : {}),
      ...(lowValue !== undefined ? { low: lowValue } : {}),
      supply,
      demand,
      ...(stockLevel !== "none" ? { stockLevel } : {}),
      ...(numberOrUndefined(volume) !== undefined
        ? { volumeEstimate: numberOrUndefined(volume)! }
        : {}),
      ...(source.trim() ? { source: source.trim() } : {}),
    });
    toast.success(price || existing ? "Price updated" : "Price saved");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{price ? "Edit Price" : "Add Price"}</DialogTitle>
          <DialogDescription>One price entry per good per date.</DialogDescription>
        </DialogHeader>

        {goods.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add a good first, then record prices.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Good *</Label>
              <Select value={goodId} onValueChange={setGoodId} disabled={Boolean(price)}>
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
              <Label htmlFor="price-date">Date *</Label>
              <Input
                id="price-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              {!price && existing && (
                <p className="text-warning text-xs">
                  A price already exists for this date — saving will update it.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price-close">Close *</Label>
                <Input
                  id="price-close"
                  type="number"
                  inputMode="decimal"
                  value={close}
                  onChange={(event) => setClose(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price-open">Open</Label>
                <Input
                  id="price-open"
                  type="number"
                  inputMode="decimal"
                  value={openPrice}
                  onChange={(event) => setOpenPrice(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price-high">High</Label>
                <Input
                  id="price-high"
                  type="number"
                  inputMode="decimal"
                  value={high}
                  onChange={(event) => setHigh(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price-low">Low</Label>
                <Input
                  id="price-low"
                  type="number"
                  inputMode="decimal"
                  value={low}
                  onChange={(event) => setLow(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Supply *</Label>
              <Select value={supply} onValueChange={(value) => setSupply(value as SupplyLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Supply / Abundant</SelectItem>
                  <SelectItem value="normal">Normal Supply</SelectItem>
                  <SelectItem value="low">Low Supply / Shortage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Demand *</Label>
              <Select value={demand} onValueChange={(value) => setDemand(value as DemandLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Demand</SelectItem>
                  <SelectItem value="normal">Normal Demand</SelectItem>
                  <SelectItem value="high">High Demand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Stock Level</Label>
              <Select
                value={stockLevel}
                onValueChange={(value) => setStockLevel(value as StockLevel | "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not recorded</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="normal">Normal Stock</SelectItem>
                  <SelectItem value="high">High Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price-volume">Volume Estimate</Label>
                <Input
                  id="price-volume"
                  type="number"
                  inputMode="decimal"
                  value={volume}
                  onChange={(event) => setVolume(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price-source">Source</Label>
                <Input
                  id="price-source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="Broker, market visit…"
                />
              </div>
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