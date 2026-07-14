"use client";

import { useState } from "react";
import { calcPlates } from "@/lib/plates";
import { useUnit } from "@/components/UnitProvider";
import { useT } from "@/components/LangProvider";

const PLATE_COLORS: Record<number, string> = {
  25: "bg-rose-600",
  20: "bg-sky-600",
  15: "bg-amber-500",
  10: "bg-emerald-600",
  5: "bg-slate-300 text-slate-900",
  2.5: "bg-orange-400 text-slate-900",
  1.25: "bg-slate-500",
};

export function PlateCalculator({ onClose }: { onClose: () => void }) {
  const unit = useUnit();
  const t = useT();
  const [weight, setWeight] = useState("60");
  const [bar, setBar] = useState(20);

  const total = parseFloat(weight.replace(",", ".")) || 0;
  const result = calcPlates(total, bar);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm card-flat p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("plate.title")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface2"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">
              {t("plate.target")} ({unit})
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-center tabular-nums focus:border-primary focus:outline-none"
            />
          </label>
          <label className="w-24">
            <span className="mb-1 block text-xs text-muted">{t("plate.bar")}</span>
            <select
              value={bar}
              onChange={(e) => setBar(Number(e.target.value))}
              className="w-full rounded-lg border border-line bg-canvas px-2 py-2 text-center focus:outline-none"
            >
              {[20, 15, 10, 7, 0].map((b) => (
                <option key={b} value={b}>
                  {b} {unit}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mb-2 text-sm text-muted">{t("plate.perSide")}</p>
        {result.perSide.length === 0 ? (
          <p className="rounded-lg bg-surface2 px-3 py-4 text-center text-sm text-faint">
            {t("plate.barOnly")} ({bar} {unit}).
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {result.perSide.map(({ plate, count }) =>
              Array.from({ length: count }).map((_, i) => (
                <span
                  key={`${plate}-${i}`}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm font-bold text-white ${
                    PLATE_COLORS[plate] ?? "bg-slate-600"
                  }`}
                >
                  {plate}
                </span>
              )),
            )}
          </div>
        )}

        {result.leftover > 0.01 && (
          <p className="mt-3 text-xs text-amber-400">
            {t("plate.notExact")}: {result.achievable} {unit}.
          </p>
        )}
      </div>
    </div>
  );
}
