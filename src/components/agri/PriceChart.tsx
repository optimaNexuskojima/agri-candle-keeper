import { useMemo } from "react";

import type { PriceEntry } from "@/lib/agri/types";

export type ChartMode = "auto" | "line" | "candles";

interface Props {
  entries: PriceEntry[];
  noteDates: Set<string>;
  mode: ChartMode;
  onSelect: (date: string) => void;
}

const HEIGHT = 260;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const SLOT = 22;
const AXIS_WIDTH = 56;

export function hasCandleData(entries: PriceEntry[]): boolean {
  const withOhlc = entries.filter((e) => e.high !== undefined && e.low !== undefined);
  return withOhlc.length >= 3 && withOhlc.length >= entries.length * 0.5;
}

export function PriceChart({ entries, noteDates, mode, onSelect }: Props) {
  const resolved: "line" | "candles" =
    mode === "auto" ? (hasCandleData(entries) ? "candles" : "line") : mode;
  const useCandles = resolved === "candles" && hasCandleData(entries);

  const geometry = useMemo(() => {
    const values: number[] = [];
    entries.forEach((entry) => {
      values.push(entry.close);
      if (entry.open !== undefined) values.push(entry.open);
      if (entry.high !== undefined) values.push(entry.high);
      if (entry.low !== undefined) values.push(entry.low);
    });
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const span = max - min || Math.max(max * 0.02, 1);
    const lo = min - span * 0.08;
    const hi = max + span * 0.08;
    const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const y = (value: number) => PADDING_TOP + ((hi - value) / (hi - lo)) * plotHeight;
    const x = (index: number) => index * SLOT + SLOT / 2;
    return { lo, hi, y, x, width: Math.max(entries.length * SLOT, 320) };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm">
        <span>No price data to chart yet.</span>
        <span className="text-xs">Add prices to see the trend.</span>
      </div>
    );
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => geometry.lo + (geometry.hi - geometry.lo) * ratio);
  const labelStep = Math.max(1, Math.ceil(entries.length / 8));

  const linePath = entries
    .map((entry, index) => `${index === 0 ? "M" : "L"}${geometry.x(index)},${geometry.y(entry.close)}`)
    .join(" ");

  return (
    <div className="flex">
      <svg width={AXIS_WIDTH} height={HEIGHT} className="shrink-0" aria-hidden>
        {ticks.map((value) => (
          <text
            key={value}
            x={AXIS_WIDTH - 6}
            y={geometry.y(value) + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[9px]"
          >
            {Math.round(value).toLocaleString()}
          </text>
        ))}
      </svg>
      <div className="flex-1 overflow-x-auto">
        <svg
          width={geometry.width}
          height={HEIGHT}
          role="img"
          aria-label={useCandles ? "Candlestick price chart" : "Line price chart"}
        >
          {ticks.map((value) => (
            <line
              key={`grid-${value}`}
              x1={0}
              x2={geometry.width}
              y1={geometry.y(value)}
              y2={geometry.y(value)}
              className="stroke-border"
              strokeWidth={1}
            />
          ))}

          {!useCandles && (
            <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} />
          )}

          {entries.map((entry, index) => {
            const cx = geometry.x(index);
            const previousClose = entries[index - 1]?.close;
            const openValue = entry.open ?? previousClose;
            const bullish = openValue === undefined ? true : entry.close >= openValue;
            const color = bullish ? "fill-primary stroke-primary" : "fill-danger stroke-danger";
            const hasNote = noteDates.has(entry.date);
            const candleReady =
              useCandles &&
              entry.high !== undefined &&
              entry.low !== undefined &&
              openValue !== undefined;

            return (
              <g
                key={entry.id}
                className="cursor-pointer"
                onClick={() => onSelect(entry.date)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSelect(entry.date);
                }}
                tabIndex={0}
                role="button"
                aria-label={`${entry.date} close ${entry.close}`}
              >
                <rect x={cx - SLOT / 2} y={0} width={SLOT} height={HEIGHT} fill="transparent" />

                {candleReady ? (
                  <>
                    <line
                      x1={cx}
                      x2={cx}
                      y1={geometry.y(entry.high!)}
                      y2={geometry.y(entry.low!)}
                      className={color}
                      strokeWidth={1.5}
                    />
                    <rect
                      x={cx - 5}
                      y={Math.min(geometry.y(openValue!), geometry.y(entry.close))}
                      width={10}
                      height={Math.max(
                        2,
                        Math.abs(geometry.y(openValue!) - geometry.y(entry.close)),
                      )}
                      rx={1.5}
                      className={color}
                    />
                  </>
                ) : useCandles ? (
                  <line
                    x1={cx - 5}
                    x2={cx + 5}
                    y1={geometry.y(entry.close)}
                    y2={geometry.y(entry.close)}
                    className="stroke-muted-foreground"
                    strokeWidth={2}
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={geometry.y(entry.close)}
                    r={hasNote ? 4 : 2.5}
                    className={hasNote ? "fill-harvest" : "fill-primary"}
                  />
                )}

                {hasNote && (
                  <circle cx={cx} cy={PADDING_TOP - 8} r={3} className="fill-harvest" />
                )}

                {index % labelStep === 0 && (
                  <text
                    x={cx}
                    y={HEIGHT - 10}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                  >
                    {entry.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}