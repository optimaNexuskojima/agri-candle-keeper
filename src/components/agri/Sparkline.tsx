interface Props {
  values: number[];
  up?: boolean;
  width?: number;
  height?: number;
}

/** Tiny presentational sparkline of recent closes. */
export function Sparkline({ values, up = true, width = 88, height = 28 }: Props) {
  if (values.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={points.join(" ")}
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={up ? "stroke-success" : "stroke-danger"}
      />
    </svg>
  );
}
