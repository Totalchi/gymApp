"use client";

import { useState } from "react";
import { addGoal } from "@/app/goals/actions";
import { useT } from "@/components/LangProvider";

export function GoalForm({
  exercises,
}: {
  exercises: { id: string; name: string }[];
}) {
  const t = useT();
  const [kind, setKind] = useState<"bodyweight" | "lift">("bodyweight");

  return (
    <form
      action={addGoal}
      className="mb-6 space-y-3 rounded-2xl border border-line bg-surface p-5"
    >
      <h2 className="font-semibold">{t("goals.new")}</h2>

      <div className="flex gap-2">
        {(["bodyweight", "lift"] as const).map((k) => (
          <label
            key={k}
            className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium transition ${
              kind === k
                ? "border-primary bg-primary/10 text-primary"
                : "border-line text-muted"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={k}
              checked={kind === k}
              onChange={() => setKind(k)}
              className="sr-only"
            />
            {k === "bodyweight" ? t("goals.bodyweight") : t("goals.lift")}
          </label>
        ))}
      </div>

      {kind === "lift" &&
        (exercises.length === 0 ? (
          <p className="text-xs text-faint">{t("goals.noLogged")}</p>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm text-muted">{t("goals.exercise")}</span>
            <select
              name="exercise_id"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 focus:border-primary focus:outline-none"
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        ))}

      <label className="block">
        <span className="mb-1 block text-sm text-muted">
          {t("goals.target")} (kg)
        </span>
        <input
          name="target"
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          required
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 tabular-nums focus:border-primary focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={kind === "lift" && exercises.length === 0}
        className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110 disabled:opacity-50"
      >
        {t("goals.add")}
      </button>
    </form>
  );
}
