"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { saveWorkout } from "@/app/workout/actions";
import { useUnit } from "@/components/UnitProvider";
import { useT } from "@/components/LangProvider";
import { PlateCalculator } from "@/components/PlateCalculator";
import { computeRir } from "@/lib/rir";
import { SET_TYPES, SET_TYPE_COLORS, type SetType } from "@/lib/types";

interface SetRow {
  reps: string;
  weight: string;
  oneRm: string;
  rir: string;
  setType: SetType;
  completed: boolean;
}

interface Group {
  exerciseId: string;
  name: string;
  image: string | null;
  restSeconds: number | null;
  previous: { weight: number | null; reps: number | null }[];
  sets: SetRow[];
}

export interface LoggerInitialGroup {
  exerciseId: string;
  name: string;
  image: string | null;
  restSeconds: number | null;
  previous: { weight: number | null; reps: number | null }[];
  sets: {
    reps: number | null;
    weight: number | null;
    oneRm: number | null;
    rir: number | null;
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
      restSeconds: g.restSeconds ?? null,
      previous: g.previous,
      sets: g.sets.map((s) => ({
        reps: s.reps != null ? String(s.reps) : "",
        weight: s.weight != null ? String(s.weight) : "",
        oneRm: s.oneRm != null ? String(s.oneRm) : "",
        rir: s.rir != null ? String(s.rir) : "",
        setType: s.setType ?? "normal",
        completed: s.completed ?? false,
      })),
    })),
  );
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const [showPlates, setShowPlates] = useState(false);
  const unit = useUnit();
  const t = useT();

  // Workout-duur: pas tellen vanaf "Start workout" (blijft bewaard bij reload).
  const startKey = `gymapp-workout-start-${sessionId}`;
  const [startMs, setStartMs] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem(startKey);
      if (v) setStartMs(parseInt(v, 10));
    } catch {}
  }, [startKey]);

  useEffect(() => {
    if (startMs == null) return;
    const update = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [startMs]);

  const running = startMs != null;

  function startWorkout() {
    const now = Date.now();
    setStartMs(now);
    try {
      localStorage.setItem(startKey, String(now));
    } catch {}
  }

  // ---- Rusttimer (timestamp-gebaseerd zodat het klopt na vergrendelen) ----
  const [restDuration, setRestDuration] = useState(120);
  const [restLeft, setRestLeft] = useState<number | null>(null); // null = geen timer
  const [restPaused, setRestPaused] = useState(false);
  const endsAtRef = useRef<number | null>(null); // tijdstip (ms) waarop de rust om is
  const pausedLeftRef = useRef<number | null>(null);
  const firedRef = useRef(false); // piep al afgespeeld?
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // Audio ontgrendelen tijdens een gebruikersactie (vereist op iOS).
  function ensureAudio() {
    try {
      if (!audioRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioRef.current = new Ctx();
      }
      const ctx = audioRef.current!;
      if (ctx.state === "suspended") void ctx.resume();
      // Stil buffertje om de audio-uitvoer te ontgrendelen.
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch {}
  }

  // Drie korte piepjes + trilling als de rust om is.
  function playDone() {
    const ctx = audioRef.current;
    if (ctx) {
      try {
        if (ctx.state === "suspended") void ctx.resume();
        const beep = (delay: number, freq: number) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = "sine";
          o.frequency.value = freq;
          const start = ctx.currentTime + delay;
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
          o.start(start);
          o.stop(start + 0.32);
        };
        beep(0, 880);
        beep(0.35, 880);
        beep(0.7, 1320);
      } catch {}
    }
    try {
      navigator.vibrate?.([300, 120, 300]);
    } catch {}
  }

  function clearTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  function finishRest() {
    if (firedRef.current) return;
    firedRef.current = true;
    clearTick();
    endsAtRef.current = null;
    setRestLeft(0);
    playDone();
    window.setTimeout(() => setRestLeft((v) => (v === 0 ? null : v)), 1500);
  }

  function startTicking() {
    clearTick();
    tickRef.current = setInterval(() => {
      if (endsAtRef.current == null) return;
      const left = Math.round((endsAtRef.current - Date.now()) / 1000);
      if (left <= 0) finishRest();
      else setRestLeft(left);
    }, 250);
  }

  function startRest(seconds: number) {
    const dur = seconds && seconds > 0 ? seconds : restDuration;
    ensureAudio();
    firedRef.current = false;
    pausedLeftRef.current = null;
    setRestPaused(false);
    endsAtRef.current = Date.now() + dur * 1000;
    setRestLeft(dur);
    startTicking();
  }

  function pauseRest() {
    if (endsAtRef.current == null) return;
    pausedLeftRef.current = Math.max(
      0,
      Math.round((endsAtRef.current - Date.now()) / 1000),
    );
    endsAtRef.current = null;
    setRestPaused(true);
    setRestLeft(pausedLeftRef.current);
    clearTick();
  }

  function resumeRest() {
    const left = pausedLeftRef.current ?? 0;
    endsAtRef.current = Date.now() + left * 1000;
    pausedLeftRef.current = null;
    setRestPaused(false);
    startTicking();
  }

  function adjustRest(delta: number) {
    if (restPaused) {
      pausedLeftRef.current = Math.max(0, (pausedLeftRef.current ?? 0) + delta);
      setRestLeft(pausedLeftRef.current);
    } else if (endsAtRef.current != null) {
      endsAtRef.current = Math.max(Date.now(), endsAtRef.current + delta * 1000);
      setRestLeft(Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000)));
    }
  }

  function stopRest() {
    clearTick();
    endsAtRef.current = null;
    pausedLeftRef.current = null;
    firedRef.current = true;
    setRestPaused(false);
    setRestLeft(null);
  }

  // Bij terugkeer naar het scherm: bijwerken en alsnog piepen als de rust voorbij is.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (endsAtRef.current == null) return;
      const left = Math.round((endsAtRef.current - Date.now()) / 1000);
      if (left <= 0) finishRest();
      else setRestLeft(left);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  useEffect(() => () => clearTick(), []);

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
    if (willComplete) startRest(groups[gi].restSeconds ?? restDuration);
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
              : { reps: "", weight: "", oneRm: "", rir: "", setType: "normal", completed: false },
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

  function stopWorkout() {
    const secs =
      startMs != null
        ? Math.max(0, Math.floor((Date.now() - startMs) / 1000))
        : elapsed;
    try {
      localStorage.removeItem(startKey);
    } catch {}
    const flat = groups.flatMap((g) =>
      g.sets.map((s, idx) => ({
        exercise_id: g.exerciseId,
        exercise_name: g.name,
        set_number: idx + 1,
        reps: num(s.reps),
        weight: num(s.weight),
        one_rep_max: num(s.oneRm),
        rir: num(s.rir),
        set_type: s.setType,
        completed: s.completed,
      })),
    );
    startTransition(() => {
      void saveWorkout(sessionId, flat, notes, secs);
    });
  }

  const completedCount = groups.reduce(
    (n, g) => n + g.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <div className="space-y-5 pb-40">
      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-faint">
          {t("wk.noExercises")}
        </p>
      )}

      {groups.map((g, gi) => (
        <section key={g.exerciseId + gi} className="rounded-2xl border border-line bg-surface">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line">
              {g.image ? (
                <Image src={g.image} alt={g.name} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">🏋️</div>
              )}
            </div>
            <h2 className="min-w-0 flex-1 truncate font-semibold">{g.name}</h2>
            <button
              type="button"
              onClick={() => startRest(g.restSeconds ?? restDuration)}
              title={t("wk.startRest")}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
            >
              ⏱ {fmtTime(g.restSeconds ?? restDuration)}
            </button>
          </header>

          <div className="space-y-1.5 p-3 sm:p-4">
            <div className="grid grid-cols-[1.75rem_4rem_1fr_1fr_2.75rem_2rem_2rem] items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-faint">
              <span>{t("wk.set")}</span>
              <span>{t("wk.previous")}</span>
              <span>{t("wk.reps")}</span>
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
                  <span className="truncate text-xs text-faint" title="Vorige keer">
                    {prevLabel}
                  </span>
                  <NumInput value={s.reps} onChange={(v) => updateSet(gi, si, "reps", v)} />
                  <NumInput value={s.weight} step="0.5" onChange={(v) => updateSet(gi, si, "weight", v)} />
                  <NumInput value={s.oneRm} step="0.5" small onChange={(v) => updateSet(gi, si, "oneRm", v)} />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={s.rir}
                    onChange={(e) => updateSet(gi, si, "rir", e.target.value)}
                    placeholder={rir ? String(rir.rir) : "–"}
                    title="Laat leeg voor automatische RIR, of vul zelf in"
                    className="w-full rounded-md border border-line bg-canvas px-0.5 py-1.5 text-center text-sm font-bold tabular-nums focus:border-primary focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => toggleComplete(gi, si)}
                      aria-label="Set afvinken"
                      className={`flex h-6 w-6 items-center justify-center rounded-md text-xs transition ${
                        s.completed
                          ? "bg-emerald-500 text-white"
                          : "bg-surface2 text-faint hover:bg-surface2"
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
                className="text-sm font-medium text-primary hover:underline"
              >
                + Set
              </button>
              {g.sets.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeSet(gi, g.sets.length - 1)}
                  className="text-xs text-faint hover:text-primary"
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
        placeholder={t("wk.notesPh")}
        rows={3}
        className="w-full rounded-2xl border border-line bg-surface px-4 py-3 placeholder:text-faint focus:border-primary focus:outline-none"
      />

      {/* Rusttimer-balk */}
      {restLeft !== null && (
        <div className="fixed inset-x-0 bottom-[4.5rem] z-30 px-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4">
            <span className="mr-auto text-sm font-medium text-sky-200">
              {t("wk.rest")}:{" "}
              <span className="tabular-nums text-base font-bold">{fmtTime(restLeft)}</span>
              {restPaused && <span className="ml-1 text-xs">⏸</span>}
            </span>
            <button type="button" onClick={() => adjustRest(-15)} className="rounded-md bg-sky-500/20 px-2 py-1 text-xs font-medium text-sky-100">
              −15
            </button>
            <button type="button" onClick={() => adjustRest(15)} className="rounded-md bg-sky-500/20 px-2 py-1 text-xs font-medium text-sky-100">
              +15
            </button>
            {restPaused ? (
              <button type="button" onClick={resumeRest} className="rounded-md bg-sky-500/30 px-3 py-1 text-xs font-semibold text-sky-50">
                ▶ {t("wk.resume")}
              </button>
            ) : (
              <button type="button" onClick={pauseRest} className="rounded-md bg-sky-500/30 px-3 py-1 text-xs font-semibold text-sky-50">
                ⏸ {t("wk.pause")}
              </button>
            )}
            <button type="button" onClick={stopRest} className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white">
              {t("wk.stop")}
            </button>
          </div>
        </div>
      )}

      {/* Vaste onderbalk: start/stop workout */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{dayName}</p>
            <p className="text-xs text-muted">
              {running ? (
                <>
                  <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 align-middle" />
                  {t("wk.inProgress")}
                </>
              ) : (
                t("wk.notStarted")
              )}{" "}
              · {completedCount} {t("wk.setsDone")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPlates(true)}
              title="Plate calculator"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm"
            >
              🏋️
            </button>
            <select
              value={restDuration}
              onChange={(e) => setRestDuration(Number(e.target.value))}
              title="Standaard rusttijd"
              className="rounded-lg border border-line bg-surface px-2 py-2 text-xs text-muted focus:outline-none"
            >
              {[60, 90, 120, 150, 180, 240].map((s) => (
                <option key={s} value={s}>
                  {t("wk.restOpt")} {s}s
                </option>
              ))}
            </select>
            {running ? (
              <button
                onClick={stopWorkout}
                disabled={pending}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? t("wk.saving") : `■ ${t("wk.stopWorkout")}`}
              </button>
            ) : (
              <button
                onClick={startWorkout}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90"
              >
                ▶ {t("wk.startWorkout")}
              </button>
            )}
          </div>
        </div>
      </div>

      {showPlates && <PlateCalculator onClose={() => setShowPlates(false)} />}
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
      className={`w-full rounded-lg border border-line bg-canvas px-1 py-1.5 text-center tabular-nums focus:border-primary focus:outline-none ${
        small ? "text-xs" : ""
      }`}
    />
  );
}
