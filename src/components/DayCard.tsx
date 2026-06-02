"use client";

import { useState } from "react";
import { ExerciseRow } from "@/components/ExerciseRow";
import { ExercisePicker } from "@/components/ExercisePicker";
import { deleteDay } from "@/app/routines/actions";
import {
  DAY_TYPE_COLORS,
  DAY_TYPE_LABELS,
  type RoutineDayWithExercises,
} from "@/lib/types";

export function DayCard({
  day,
  routineId,
}: {
  day: RoutineDayWithExercises;
  routineId: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[day.day_type]}`}
          >
            {DAY_TYPE_LABELS[day.day_type]}
          </span>
          <h2 className="text-lg font-semibold">{day.name}</h2>
          <span className="text-sm text-slate-500">
            {day.exercises.length}{" "}
            {day.exercises.length === 1 ? "oefening" : "oefeningen"}
          </span>
        </div>
        <form action={deleteDay}>
          <input type="hidden" name="id" value={day.id} />
          <input type="hidden" name="routine_id" value={routineId} />
          <button
            type="submit"
            className="text-xs text-slate-500 transition hover:text-rose-400"
          >
            Dag verwijderen
          </button>
        </form>
      </header>

      <div className="divide-y divide-slate-800">
        {day.exercises.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">
            Nog geen oefeningen op deze dag.
          </p>
        ) : (
          day.exercises.map((ex) => (
            <ExerciseRow key={ex.id} item={ex} routineId={routineId} />
          ))
        )}
      </div>

      <div className="px-5 py-4">
        <button
          onClick={() => setPickerOpen(true)}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-500 hover:text-rose-400"
        >
          + Oefening toevoegen
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          dayId={day.id}
          routineId={routineId}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  );
}
