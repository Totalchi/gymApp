"use client";

import { useId, useRef, useState } from "react";
import { useT } from "@/components/LangProvider";

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Dependency-vrije lijngrafiek voor voortgang.
 * - Kleuren via thema-tokens (leesbaar in donker én licht).
 * - Tekst en punten in HTML (niet mee-uitgerekt met de SVG).
 * - Aanraken/hover: crosshair + tooltip met exacte waarde.
 */
export function LineChart({
  points,
  unit = "",
  color = "var(--c-chart)",
  height = 170,
}: {
  points: ChartPoint[];
  unit?: string;
  color?: string;
  height?: number;
}) {
  const gradId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const t = useT();

  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-faint">
        {t("chart.noData")}
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Posities in procenten; 6% lucht boven- en onderaan zodat punten niet
  // tegen de rand plakken.
  const xPct = (i: number) =>
    points.length === 1 ? 50 : (i / (points.length - 1)) * 100;
  const yPct = (v: number) => 6 + (1 - (v - min) / range) * 88;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xPct(i).toFixed(2)} ${yPct(p.value).toFixed(2)}`)
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;

  function onMove(e: React.PointerEvent) {
    const el = plotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(frac * (points.length - 1)));
  }

  const fmt = (v: number) =>
    `${Math.round(v * 10) / 10}${unit ? ` ${unit}` : ""}`;
  const showDots = points.length <= 24;
  const a = active != null ? points[active] : null;

  return (
    <div className="flex gap-2" role="img" aria-label={`Grafiek, ${points.length} punten, ${fmt(min)} tot ${fmt(max)}`}>
      {/* Y-as (HTML: schaalt niet mee met de plot) */}
      <div
        className="flex w-9 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-faint"
        style={{ height }}
      >
        <span>{Math.round(max)}</span>
        <span>{Math.round((max + min) / 2)}</span>
        <span>{Math.round(min)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div
          ref={plotRef}
          className="relative touch-none"
          style={{ height }}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setActive(null)}
        >
          {/* Recessieve hulplijnen */}
          {[6, 50, 94].map((top) => (
            <div
              key={top}
              className="absolute inset-x-0 border-t"
              style={{ top: `${top}%`, borderColor: "var(--c-chart-grid)" }}
            />
          ))}

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Punten als HTML (perfect rond, niet uitgerekt) */}
          {showDots &&
            points.map((p, i) => (
              <span
                key={i}
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${xPct(i)}%`,
                  top: `${yPct(p.value)}%`,
                  backgroundColor: color,
                }}
              />
            ))}

          {/* Crosshair + actieve punt + tooltip */}
          {a && active != null && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 border-l border-dashed"
                style={{ left: `${xPct(active)}%`, borderColor: "var(--c-faint)" }}
              />
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                style={{
                  left: `${xPct(active)}%`,
                  top: `${yPct(a.value)}%`,
                  backgroundColor: color,
                }}
              />
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-xs shadow-[var(--shadow)]"
                style={{
                  left: `clamp(3rem, ${xPct(active)}%, calc(100% - 3rem))`,
                  top: 0,
                }}
              >
                <span className="font-semibold tabular-nums">{fmt(a.value)}</span>
                <span className="ml-1.5 text-faint">{a.label}</span>
              </div>
            </>
          )}
        </div>

        {/* X-as: eerste en laatste label */}
        <div className="mt-1 flex justify-between text-[10px] text-faint">
          <span>{points[0].label}</span>
          {points.length > 1 && <span>{points[points.length - 1].label}</span>}
        </div>
      </div>
    </div>
  );
}
