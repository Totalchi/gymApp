"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  updateRoutineExercise,
  deleteRoutineExercise,
} from "@/app/routines/actions";
import { computeRir, estimateOneRepMax } from "@/lib/rir";
import type { RoutineExerciseWithExercise } from "@/lib/types";

export function ExerciseRow({
  item,
  routineId,
}: {
  item: RoutineExerciseWithExercise;
  routineId: string;
}) {
  const [sets, setSets] = useState(String(item.sets));
  const [reps, setReps] = useState(String(item.reps));
  const [weight, setWeight] = useState(item.weight != null ? String(item.weight) : "");
  const [oneRm, setOneRm] = useState(
    item.one_rep_max != null ? String(item.one_rep_max) : "",
  );
  const [dirty, setDirty] = useState(false);

  const img = item.exercise.image_urls?.[0];

  // Live RIR-berekening terwijl je typt.
  const rir = useMemo(() => {
    const w = parseFloat(weight.replace(",", "."));
    const r = parseInt(reps, 10);
    const orm = parseFloat(oneRm.replace(",", "."));
    if (!w || !r || !orm) return null;
    return computeRir({ weight: w, reps: r, oneRepMax: orm });
  }, [weight, reps, oneRm]);

  // Voorstel voor 1RM op basis van het ingevoerde gewicht × reps (tot falen).
  const suggestOneRm = () => {
    const w = parseFloat(weight.replace(",", "."));
    const r = parseInt(reps, 10);
    if (w && r) {
      setOneRm(estimateOneRepMax(w, r, 0).toFixed(1));
      setDirty(true);
    }
  };

  return (
    <form
      action={updateRoutineExercise}
      onSubmit={() => setDirty(false)}
      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="routine_id" value={routineId} />

      {/* Afbeelding + naam */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-700">
          {img ? (
            <Image
              src={img}
              alt={item.exercise.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl">
              🏋️
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{item.exercise.name}</p>
          <p className="truncate text-xs text-slate-500">
            {item.exercise.primary_muscles.join(", ")}
            {item.exercise.equipment ? ` · ${item.exercise.equipment}` : ""}
          </p>
        </div>
      </div>

      {/* Velden */}
      <div className="grid grid-cols-4 gap-2 sm:flex sm:items-end sm:gap-3">
        <NumField label="Sets" name="sets" value={sets} onChange={(v) => { setSets(v); setDirty(true); }} />
        <NumField label="Reps" name="reps" value={reps} onChange={(v) => { setReps(v); setDirty(true); }} />
        <NumField label="kg" name="weight" value={weight} onChange={(v) => { setWeight(v); setDirty(true); }} step="0.5" />
        <NumField label="1RM" name="one_rep_max" value={oneRm} onChange={(v) => { setOneRm(v); setDirty(true); }} step="0.5" onDouble={suggestOneRm} />

        {/* RIR badge */}
        <div className="col-span-4 flex flex-col items-center sm:col-span-1">
          <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            RIR
          </span>
          {rir ? (
            <span
              className="rounded-lg px-2.5 py-1.5 text-sm font-bold tabular-nums ring-1"
              style={rirStyle(rir.rir)}
              title={`RPE ${rir.rpe} · ${Math.round(rir.intensity * 100)}% 1RM`}
            >
              {rir.rir}
            </span>
          ) : (
            <span
              className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 ring-1 ring-slate-700"
              title="Vul kg en 1RM in voor automatische RIR"
            >
              –
            </span>
          )}
        </div>
      </div>

      {/* Acties */}
      <div className="flex items-center gap-2 sm:flex-col">
        <button
          type="submit"
          disabled={!dirty}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-40"
        >
          {dirty ? "Opslaan" : "Opgeslagen"}
        </button>
        <button
          type="submit"
          formAction={deleteRoutineExercise}
          className="text-xs text-slate-500 transition hover:text-rose-400"
        >
          Verwijderen
        </button>
      </div>
    </form>
  );
}

function NumField({
  label,
  name,
  value,
  onChange,
  step,
  onDouble,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  onDouble?: () => void;
}) {
  return (
    <label className="flex flex-col">
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        name={name}
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onDoubleClick={onDouble}
        title={onDouble ? "Dubbelklik om 1RM te schatten uit kg × reps" : undefined}
        className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center tabular-nums focus:border-rose-500 focus:outline-none"
      />
    </label>
  );
}

/** Kleur de RIR-badge: dichter bij falen (laag RIR) = roder. */
function rirStyle(rir: number): React.CSSProperties {
  if (rir <= 1)
    return { backgroundColor: "rgb(244 63 94 / 0.15)", color: "rgb(253 164 175)", boxShadow: "inset 0 0 0 1px rgb(244 63 94 / 0.3)" };
  if (rir <= 3)
    return { backgroundColor: "rgb(245 158 11 / 0.15)", color: "rgb(252 211 77)", boxShadow: "inset 0 0 0 1px rgb(245 158 11 / 0.3)" };
  return { backgroundColor: "rgb(16 185 129 / 0.15)", color: "rgb(110 231 183)", boxShadow: "inset 0 0 0 1px rgb(16 185 129 / 0.3)" };
}
