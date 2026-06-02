"use client";

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Eenvoudige, dependency-vrije SVG-lijngrafiek voor voortgang.
 */
export function LineChart({
  points,
  unit = "",
  color = "#fb7185",
  height = 160,
}: {
  points: ChartPoint[];
  unit?: string;
  color?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        Nog geen data.
      </div>
    );
  }

  const width = 600;
  const padX = 36;
  const padY = 16;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const x = (i: number) =>
    points.length === 1
      ? padX + innerW / 2
      : padX + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padY + innerH - ((v - min) / range) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");

  const area = `${path} L ${x(points.length - 1).toFixed(1)} ${padY + innerH} L ${x(0).toFixed(1)} ${padY + innerH} Z`;

  const gradientId = `grad-${color.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontale hulplijnen + waarden */}
      {[max, (max + min) / 2, min].map((v, i) => {
        const yy = padY + (i / 2) * innerH;
        return (
          <g key={i}>
            <line
              x1={padX}
              y1={yy}
              x2={width - padX}
              y2={yy}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text x={4} y={yy + 4} fill="#64748b" fontSize="10">
              {Math.round(v)}
              {unit}
            </text>
          </g>
        );
      })}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />

      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" fill={color}>
          <title>
            {p.label}: {p.value}
            {unit}
          </title>
        </circle>
      ))}
    </svg>
  );
}
