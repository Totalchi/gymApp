"use client";

import { useState } from "react";
import { addDay } from "@/app/routines/actions";
import { useT } from "@/components/LangProvider";
import { DAY_TYPES, DAY_TYPE_LABELS, type DayType } from "@/lib/types";

export function AddDayForm({ routineId }: { routineId: string }) {
  const [open, setOpen] = useState(false);
  const [dayType, setDayType] = useState<DayType>("push");
  const t = useT();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 w-full rounded-2xl border border-dashed border-line py-4 text-muted transition hover:border-primary hover:text-primary"
      >
        {t("routine.addDay")}
      </button>
    );
  }

  return (
    <form
      action={addDay}
      onSubmit={() => setOpen(false)}
      className="mt-5 card-flat p-5"
    >
      <input type="hidden" name="routine_id" value={routineId} />
      <h3 className="mb-3 font-semibold">{t("routine.newDay")}</h3>

      <div className="mb-3 flex flex-wrap gap-2">
        {DAY_TYPES.map((t) => (
          <label
            key={t}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              dayType === t
                ? "bg-primary text-primary-fg ring-primary"
                : "bg-canvas text-muted ring-line hover:ring-muted"
            }`}
          >
            <input
              type="radio"
              name="day_type"
              value={t}
              checked={dayType === t}
              onChange={() => setDayType(t)}
              className="sr-only"
            />
            {DAY_TYPE_LABELS[t]}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="name"
          defaultValue={DAY_TYPE_LABELS[dayType]}
          key={dayType}
          placeholder={t("routine.dayNamePh")}
          className="flex-1 input"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="btn-primary"
          >
            {t("routine.add")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-line px-4 py-2.5 text-muted transition hover:bg-surface2"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}
