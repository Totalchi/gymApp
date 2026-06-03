"use client";

import { useState } from "react";
import { addDay } from "@/app/routines/actions";
import { DAY_TYPES, DAY_TYPE_LABELS, type DayType } from "@/lib/types";

export function AddDayForm({ routineId }: { routineId: string }) {
  const [open, setOpen] = useState(false);
  const [dayType, setDayType] = useState<DayType>("push");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 w-full rounded-2xl border border-dashed border-line py-4 text-muted transition hover:border-primary hover:text-primary"
      >
        + Dag toevoegen
      </button>
    );
  }

  return (
    <form
      action={addDay}
      onSubmit={() => setOpen(false)}
      className="mt-5 rounded-2xl border border-line bg-surface p-5"
    >
      <input type="hidden" name="routine_id" value={routineId} />
      <h3 className="mb-3 font-semibold">Nieuwe dag</h3>

      <div className="mb-3 flex flex-wrap gap-2">
        {DAY_TYPES.map((t) => (
          <label
            key={t}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              dayType === t
                ? "bg-primary text-white ring-primary"
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
          placeholder="Naam van de dag"
          className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 focus:border-primary focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white transition hover:opacity-90"
          >
            Toevoegen
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-line px-4 py-2.5 text-muted transition hover:bg-surface2"
          >
            Annuleren
          </button>
        </div>
      </div>
    </form>
  );
}
