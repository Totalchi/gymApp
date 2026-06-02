"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { saveWorkout } from "@/app/workout/actions";
import { computeRir } from "@/lib/rir";

interface SetRow {
  reps: string;
  weight: string;
  oneRm: string;
}

interface Group {
  exerciseId: string;
  name: string;
  image: string | null;
  sets: SetRow[];
}

export interface LoggerInitialGroup {
  exerciseId: string;
  name: string;
  image: string | null;
  sets: { reps: number | null; weight: number | null; oneRm: number | null }[];
}

function num(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

export function WorkoutLogger({
  sessionId,
  dayName,
  initialGroups,
  initialNotes,
}: {
  sessionId: string;
  dayName: string;
  initialGroups: LoggerInitialGroup[];
  initialNotes: string;
}) {
  const [groups, setGroups] = useState<Group[]>(() =>
    initialGroups.map((g) => ({
      exerciseId: g.exerciseId,
      name: g.name,
      image: g.image,
      sets: g.sets.map((s) => ({
        reps: s.reps != null ? String(s.reps) : "",
        weight: s.weight != null ? String(s.weight) : "",
        oneRm: s.oneRm != null ? String(s.oneRm) : "",
      })),
    })),
  );
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();

  function updateSet(gi: number, si: number, field: keyof SetRow, value: string) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              sets: g.sets.map((s, j) =>
                j !== si ? s : { ...s, [field]: value },
              ),
            },
      ),
    );
  }

  function addSet(gi: number) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const last = g.sets[g.sets.length - 1];
        return {
          ...g,
          sets: [...g.sets, last ? { ...last } : { reps: "", weight: "", oneRm: "" }],
        };
      }),
    );
  }

  function removeSet(gi: number, si: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== gi ? g : { ...g, sets: g.sets.filter((_, j) => j !== si) },
      ),
    );
  }

  function save() {
    const flat = groups.flatMap((g) =>
      g.sets.map((s, idx) => ({
        exercise_id: g.exerciseId,
        exercise_name: g.name,
        set_number: idx + 1,
        reps: num(s.reps),
        weight: num(s.weight),
        one_rep_max: num(s.oneRm),
      })),
    );
    startTransition(() => {
      void saveWorkout(sessionId, flat, notes);
    });
  }

  return (
    <div className="space-y-5 pb-24">
      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-800 py-12 text-center text-slate-500">
          Deze sessie heeft geen oefeningen.
        </p>
      )}

      {groups.map((g, gi) => (
        <section
          key={g.exerciseId + gi}
          className="rounded-2xl border border-slate-800 bg-slate-900/50"
        >
          <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-700">
              {g.image ? (
                <Image src={g.image} alt={g.name} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">🏋️</div>
              )}
            </div>
            <h2 className="font-semibold">{g.name}</h2>
          </header>

          <div className="space-y-2 p-4">
            <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_2.5rem_1.5rem] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <span>#</span>
              <span>Reps</span>
              <span>kg</span>
              <span>1RM</span>
              <span className="text-center">RIR</span>
              <span></span>
            </div>
            {g.sets.map((s, si) => {
              const w = num(s.weight);
              const r = num(s.reps);
              const orm = num(s.oneRm);
              const rir =
                w && r && orm ? computeRir({ weight: w, reps: r, oneRepMax: orm }) : null;
              return (
                <div
                  key={si}
                  className="grid grid-cols-[1.5rem_1fr_1fr_1fr_2.5rem_1.5rem] items-center gap-2"
                >
                  <span className="text-sm tabular-nums text-slate-500">{si + 1}</span>
                  <NumInput value={s.reps} onChange={(v) => updateSet(gi, si, "reps", v)} />
                  <NumInput value={s.weight} step="0.5" onChange={(v) => updateSet(gi, si, "weight", v)} />
                  <NumInput value={s.oneRm} step="0.5" onChange={(v) => updateSet(gi, si, "oneRm", v)} />
                  <span className="text-center text-sm font-bold tabular-nums text-slate-200">
                    {rir ? rir.rir : "–"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSet(gi, si)}
                    className="text-slate-600 transition hover:text-rose-400"
                    aria-label="Set verwijderen"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => addSet(gi)}
              className="mt-1 text-sm font-medium text-rose-400 hover:underline"
            >
              + Set
            </button>
          </div>
        </section>
      ))}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notities over deze workout (optioneel)"
        rows={3}
        className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
      />

      {/* Vaste opslaan-balk */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-sm text-slate-400">{dayName}</span>
          <button
            onClick={save}
            disabled={pending}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Opslaan..." : "Workout opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  step = "1",
}: {
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center tabular-nums focus:border-rose-500 focus:outline-none"
    />
  );
}
