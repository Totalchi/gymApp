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
        className="mt-5 w-full rounded-2xl border border-dashed border-slate-700 py-4 text-slate-400 transition hover:border-rose-500 hover:text-rose-400"
      >
        + Dag toevoegen
      </button>
    );
  }

  return (
    <form
      action={addDay}
      onSubmit={() => setOpen(false)}
      className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
    >
      <input type="hidden" name="routine_id" value={routineId} />
      <h3 className="mb-3 font-semibold">Nieuwe dag</h3>

      <div className="mb-3 flex flex-wrap gap-2">
        {DAY_TYPES.map((t) => (
          <label
            key={t}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              dayType === t
                ? "bg-rose-500 text-white ring-rose-500"
                : "bg-slate-950 text-slate-300 ring-slate-700 hover:ring-slate-500"
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
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 focus:border-rose-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90"
          >
            Toevoegen
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-slate-300 transition hover:bg-slate-800"
          >
            Annuleren
          </button>
        </div>
      </div>
    </form>
  );
}
