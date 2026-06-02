"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { saveWorkout } from "@/app/workout/actions";
import { useUnit } from "@/components/UnitProvider";
import { computeRir } from "@/lib/rir";
import { SET_TYPES, SET_TYPE_COLORS, type SetType } from "@/lib/types";

interface SetRow {
  reps: string;
  weight: string;
  oneRm: string;
  setType: SetType;
  completed: boolean;
}

interface Group {
  exerciseId: string;
  name: string;
  image: string | null;
  previous: { weight: number | null; reps: number | null }[];
  sets: SetRow[];
}

export interface LoggerInitialGroup {
  exerciseId: string;
  name: string;
  image: string | null;
  previous: { weight: number | null; reps: number | null }[];
  sets: {
    reps: number | null;
    weight: number | null;
    oneRm: number | null;
    setType: SetType;
    completed: boolean;
  }[];
}

function num(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

function fmtTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WorkoutLogger({
  sessionId,
  dayName,
  startedAt,
  initialGroups,
  initialNotes,
}: {
  sessionId: string;
  dayName: string;
  startedAt: string;
  initialGroups: LoggerInitialGroup[];
  initialNotes: string;
}) {
  const [groups, setGroups] = useState<Group[]>(() =>
    initialGroups.map((g) => ({
      exerciseId: g.exerciseId,
      name: g.name,
      image: g.image,
      previous: g.previous,
      sets: g.sets.map((s) => ({
        reps: s.reps != null ? String(s.reps) : "",
        weight: s.weight != null ? String(s.weight) : "",
        oneRm: s.oneRm != null ? String(s.oneRm) : "",
        setType: s.setType ?? "normal",
        completed: s.completed ?? false,
      })),
    })),
  );
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const unit = useUnit();

  // Workout-duur (loopt vanaf de starttijd van de sessie).
  const startMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startMs) / 1000)),
  );
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000))),
      1000,
    );
    return () => clearInterval(t);
  }, [startMs]);

  // Rusttimer.
  const [restDuration, setRestDuration] = useState(120);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  function startRest(seconds: number) {
    setRestLeft(seconds);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestLeft((v) => {
        if (v === null) return null;
        if (v <= 1) {
          if (restRef.current) clearInterval(restRef.current);
          return null;
        }
        return v - 1;
      });
    }, 1000);
  }
  function stopRest() {
    if (restRef.current) clearInterval(restRef.current);
    setRestLeft(null);
  }
  useEffect(() => () => stopRest(), []);

  function updateSet<K extends keyof SetRow>(
    gi: number,
    si: number,
    field: K,
    value: SetRow[K],
  ) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== gi
          ? g
          : { ...g, sets: g.sets.map((s, j) => (j !== si ? s : { ...s, [field]: value })) },
      ),
    );
  }

  function toggleComplete(gi: number, si: number) {
    const willComplete = !groups[gi].sets[si].completed;
    updateSet(gi, si, "completed", willComplete);
    if (willComplete) startRest(restDuration);
  }

  function cycleType(gi: number, si: number) {
    const cur = groups[gi].sets[si].setType;
    const next = SET_TYPES[(SET_TYPES.indexOf(cur) + 1) % SET_TYPES.length];
    updateSet(gi, si, "setType", next);
  }

  function addSet(gi: number) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const last = g.sets[g.sets.length - 1];
        return {
          ...g,
          sets: [
            ...g.sets,
            last
              ? { ...last, completed: false }
              : { reps: "", weight: "", oneRm: "", setType: "normal", completed: false },
          ],
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
        set_type: s.setType,
        completed: s.completed,
      })),
    );
    startTransition(() => {
      void saveWorkout(sessionId, flat, notes, elapsed);
    });
  }

  const completedCount = groups.reduce(
    (n, g) => n + g.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <div className="space-y-5 pb-40">
      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-800 py-12 text-center text-slate-500">
          Deze sessie heeft geen oefeningen.
        </p>
      )}

      {groups.map((g, gi) => (
        <section key={g.exerciseId + gi} className="rounded-2xl border border-slate-800 bg-slate-900/50">
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

          <div className="space-y-1.5 p-3 sm:p-4">
            <div className="grid grid-cols-[1.75rem_4rem_1fr_1fr_2.75rem_2rem_2rem] items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              <span>Set</span>
              <span>Vorige</span>
              <span>Reps</span>
              <span>{unit}</span>
              <span className="text-center">1RM</span>
              <span className="text-center">RIR</span>
              <span></span>
            </div>

            {g.sets.map((s, si) => {
              const w = num(s.weight);
              const r = num(s.reps);
              const orm = num(s.oneRm);
              const rir = w && r && orm ? computeRir({ weight: w, reps: r, oneRepMax: orm }) : null;
              const prev = g.previous[si];
              const prevLabel =
                prev && prev.weight != null && prev.reps != null
                  ? `${prev.weight}×${prev.reps}`
                  : "—";
              // Set-nummer telt alleen niet-warmup sets.
              const workingNumber =
                g.sets.slice(0, si + 1).filter((x) => x.setType !== "warmup").length;
              return (
                <div
                  key={si}
                  className={`grid grid-cols-[1.75rem_4rem_1fr_1fr_2.75rem_2rem_2rem] items-center gap-1.5 rounded-lg py-0.5 ${
                    s.completed ? "bg-emerald-500/10" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => cycleType(gi, si)}
                    title="Klik voor warmup / drop / failure"
                    className={`text-sm font-bold tabular-nums ${SET_TYPE_COLORS[s.setType]}`}
                  >
                    {s.setType === "warmup"
                      ? "W"
                      : s.setType === "drop"
                        ? "D"
                        : s.setType === "failure"
                          ? "F"
                          : workingNumber}
                  </button>
                  <span className="truncate text-xs text-slate-500" title="Vorige keer">
                    {prevLabel}
                  </span>
                  <NumInput value={s.reps} onChange={(v) => updateSet(gi, si, "reps", v)} />
                  <NumInput value={s.weight} step="0.5" onChange={(v) => updateSet(gi, si, "weight", v)} />
                  <NumInput value={s.oneRm} step="0.5" small onChange={(v) => updateSet(gi, si, "oneRm", v)} />
                  <span className="text-center text-sm font-bold tabular-nums text-slate-300">
                    {rir ? rir.rir : "–"}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => toggleComplete(gi, si)}
                      aria-label="Set afvinken"
                      className={`flex h-6 w-6 items-center justify-center rounded-md text-xs transition ${
                        s.completed
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => addSet(gi)}
                className="text-sm font-medium text-rose-400 hover:underline"
              >
                + Set
              </button>
              {g.sets.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeSet(gi, g.sets.length - 1)}
                  className="text-xs text-slate-500 hover:text-rose-400"
                >
                  − Set
                </button>
              )}
            </div>
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

      {/* Rusttimer-balk */}
      {restLeft !== null && (
        <div className="fixed inset-x-0 bottom-[4.5rem] z-30 px-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 backdrop-blur">
            <span className="text-sm font-medium text-sky-200">
              Rust: <span className="tabular-nums">{fmtTime(restLeft)}</span>
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRestLeft((v) => (v ?? 0) + 15)} className="rounded-md bg-sky-500/20 px-2 py-1 text-xs text-sky-100">
                +15s
              </button>
              <button type="button" onClick={() => setRestLeft((v) => Math.max(0, (v ?? 0) - 15))} className="rounded-md bg-sky-500/20 px-2 py-1 text-xs text-sky-100">
                −15s
              </button>
              <button type="button" onClick={stopRest} className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vaste onderbalk: duur + opslaan */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{dayName}</p>
            <p className="text-xs text-slate-400">
              ⏱ <span className="tabular-nums">{fmtTime(elapsed)}</span> · {completedCount} sets gedaan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={restDuration}
              onChange={(e) => setRestDuration(Number(e.target.value))}
              title="Standaard rusttijd"
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-300 focus:outline-none"
            >
              {[60, 90, 120, 150, 180, 240].map((s) => (
                <option key={s} value={s}>
                  rust {s}s
                </option>
              ))}
            </select>
            <button
              onClick={save}
              disabled={pending}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Opslaan..." : "Klaar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  step = "1",
  small = false,
}: {
  value: string;
  onChange: (v: string) => void;
  step?: string;
  small?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-1 py-1.5 text-center tabular-nums focus:border-rose-500 focus:outline-none ${
        small ? "text-xs" : ""
      }`}
    />
  );
}
