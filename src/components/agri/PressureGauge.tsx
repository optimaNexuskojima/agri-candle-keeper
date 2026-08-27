interface Props {
  score: number | null;
  size?: number;
}

export function buyingPercent(score: number): number {
  return ((score + 4) / 8) * 100;
}

/** Semi-circle gauge: Buying % = ((score + 4) / 8) * 100. */
export function PressureGauge({ score, size = 168 }: Props) {
  const width = size;
  const height = size / 2 + 12;
  const radius = size / 2 - 10;
  const cx = width / 2;
  const cy = size / 2;
  const buying = score === null ? 50 : buyingPercent(score);
  const selling = 100 - buying;
  const arc = Math.PI * radius;

  const track = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} aria-label={`Buying pressure ${buying.toFixed(0)} percent`}>
          <path
            d={track}
            fill="none"
            strokeWidth={12}
            strokeLinecap="round"
            className="stroke-danger/25"
          />
          <path
            d={track}
            fill="none"
            strokeWidth={12}
            strokeLinecap="round"
            className="stroke-success"
            strokeDasharray={`${(arc * buying) / 100} ${arc}`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-success pm-num text-2xl font-bold">{buying.toFixed(0)}%</p>
          <p className="pm-label">Buying</p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="bg-success/12 text-success flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold">
          Buying {buying.toFixed(0)}%
        </div>
        <div className="bg-danger/12 text-danger flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold">
          Selling {selling.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
