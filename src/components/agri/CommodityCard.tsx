import { Link } from "@tanstack/react-router";
import { MessageSquare, Star } from "lucide-react";

import { GoodIcon } from "@/components/agri/GoodIcon";
import { Sparkline } from "@/components/agri/Sparkline";
import { formatPrice, type GoodStats } from "@/lib/agri/logic";
import { cn } from "@/lib/utils";

interface Props {
  stats: GoodStats;
  closes: number[];
  notesCount: number;
  favorite: boolean;
  onToggleFavorite: () => void;
}

function ChangePill({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-semibold">
        —
      </span>
    );
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "pm-num rounded-full px-2.5 py-1 text-xs font-semibold",
        up ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
      )}
    >
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function CommodityCard({ stats, closes, notesCount, favorite, onToggleFavorite }: Props) {
  const { good, latest } = stats;
  const up = (stats.dailyChange ?? stats.change7d ?? 0) >= 0;

  return (
    <div className="pm-card p-4">
      <div className="flex items-start gap-3">
        <GoodIcon name={good.name} />
        <div className="min-w-0 flex-1">
          <Link
            to="/goods/$goodId"
            params={{ goodId: good.id }}
            className="block truncate font-semibold"
          >
            {good.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="bg-elevated text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
              {good.category ?? "Uncategorised"}
            </span>
            <span className="text-muted-foreground text-[11px]">per {good.unit}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={favorite ? `Unstar ${good.name}` : `Star ${good.name}`}
          className={cn(
            "-mt-1 -mr-1 inline-flex size-9 items-center justify-center rounded-full",
            favorite ? "text-warning" : "text-muted-foreground",
          )}
        >
          <Star className={cn("size-4", favorite && "fill-current")} />
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="pm-num text-2xl font-bold tracking-tight">
            {formatPrice(latest?.close, good.currency)}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <ChangePill value={stats.dailyChange} />
            <span className="pm-label">1D</span>
          </div>
        </div>
        <Sparkline values={closes} up={up} />
      </div>

      <div className="border-border text-muted-foreground mt-3 flex items-center gap-4 border-t pt-3 text-[11px] font-medium">
        <span className="pm-num">
          Vol {latest?.volumeEstimate ? latest.volumeEstimate.toLocaleString() : "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3.5" />
          <span className="pm-num">{notesCount}</span>
        </span>
        <span className="ml-auto uppercase">{stats.seasonStatus}</span>
      </div>
    </div>
  );
}
