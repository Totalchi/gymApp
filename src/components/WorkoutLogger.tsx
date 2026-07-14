"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { autosaveWorkout, saveWorkout } from "@/app/workout/actions";
import { createClient } from "@/lib/supabase/client";
import { useUnit } from "@/components/UnitProvider";
import { useT } from "@/components/LangProvider";
import { PlateCalculator } from "@/components/PlateCalculator";
import { ExercisePicker } from "@/components/ExercisePicker";
import { ExerciseDetailModal } from "@/components/ExerciseDetailModal";
import type { ProgressionSuggestion } from "@/lib/progression";
import { SET_TYPES, SET_TYPE_COLORS, type SetType, type Exercise } from "@/lib/types";

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
  suggestion: ProgressionSuggestion | null;
  unilateral: boolean;
  repTarget: string | null;
  sets: SetRow[];
}

export interface LoggerInitialGroup {
  exerciseId: string;
  name: string;
  image: string | null;
  restSeconds: number | null;
  previous: { weight: number | null; reps: number | null }[];
  suggestion?: ProgressionSuggestion | null;
  unilateral?: boolean;
  repTarget?: string | null;
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

/** Zet de logger-state om naar rijen voor de database. */
function flattenGroups(groups: Group[]) {
  return groups.flatMap((g, gi) =>
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
      unilateral: g.unilateral,
      position: gi,
    })),
  );
}

/** Ruim oude workout-drafts op (ouder dan 7 dagen). */
function purgeOldDrafts() {
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith("gymapp-workout-draft-")) continue;
      try {
        const at = (JSON.parse(localStorage.getItem(key) ?? "{}") as { at?: number }).at;
        if (!at || at < cutoff) localStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {}
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
      suggestion: g.suggestion ?? null,
      unilateral: g.unilateral ?? false,
      repTarget: g.repTarget ?? null,
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
  const [showAdd, setShowAdd] = useState(false);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);

  // Haal de volledige oefening op (foto's + uitleg) en toon de popup.
  async function openDetail(exerciseId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", exerciseId)
      .maybeSingle();
    if (data) setDetailEx(data as Exercise);
  }

  function swapExercise(ex: Exercise) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== swapIdx
          ? g
          : {
              ...g,
              exerciseId: ex.id,
              name: ex.name,
              image: ex.image_urls?.[0] ?? null,
              restSeconds: null,
              previous: [],
              suggestion: null,
              unilateral: false,
              repTarget: null,
            },
      ),
    );
    setSwapIdx(null);
  }

  function addExercise(ex: Exercise) {
    setGroups((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        name: ex.name,
        image: ex.image_urls?.[0] ?? null,
        restSeconds: null,
        previous: [],
        suggestion: null,
        unilateral: false,
        repTarget: null,
        sets: [
          { reps: "", weight: "", oneRm: "", rir: "", setType: "normal", completed: false },
        ],
      },
    ]);
  }
  const unit = useUnit();
  const t = useT();

  // ---- Draft: niets kwijtraken als de app mid-workout wordt weggegooid ----
  // Elke wijziging gaat meteen naar localStorage en (met een korte vertraging)
  // naar de server. Bij het heropenen van de sessie wordt de draft hersteld.
  const draftKey = `gymapp-workout-draft-${sessionId}`;
  const firstRunRef = useRef(true);
  const dirtyRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupsRef = useRef(groups);
  const notesRef = useRef(notes);
  groupsRef.current = groups;
  notesRef.current = notes;

  // Herstel de draft bij het openen (na een reload of geheugen-kill).
  useEffect(() => {
    try {
      purgeOldDrafts();
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { groups?: Group[]; notes?: string };
        if (Array.isArray(draft.groups) && draft.groups.length) setGroups(draft.groups);
        if (typeof draft.notes === "string") setNotes(draft.notes);
      }
    } catch {}
  }, [draftKey]);

  function flushAutosave() {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
    void autosaveWorkout(sessionId, flattenGroups(groupsRef.current), notesRef.current);
  }

  // Bij elke wijziging: direct lokaal bewaren + server-autosave inplannen.
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify({ groups, notes, at: Date.now() }));
    } catch {}
    dirtyRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(flushAutosave, 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, notes, draftKey]);

  // App naar de achtergrond (of tab dicht): meteen naar de server schrijven.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") flushAutosave();
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(
    () => () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    },
    [],
  );

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
    // finishRest is bewust stabiel; opnieuw binden is niet nodig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (willComplete) {
      try {
        navigator.vibrate?.(18);
      } catch {}
      startRest(groups[gi].restSeconds ?? restDuration);
    }
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

  // Voeg een warmup-set toe bovenaan (telt niet mee in records/1RM).
  function addWarmup(gi: number) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const firstWorking = g.sets.find((s) => num(s.weight));
        const w = firstWorking ? num(firstWorking.weight) : null;
        const warm = w ? String(Math.round(w * 0.5 * 2) / 2) : "";
        return {
          ...g,
          sets: [
            { reps: "", weight: warm, oneRm: "", rir: "", setType: "warmup", completed: false },
            ...g.sets,
          ],
        };
      }),
    );
  }

  function stopWorkout() {
    const secs =
      startMs != null
        ? Math.max(0, Math.floor((Date.now() - startMs) / 1000))
        : elapsed;
    // Autosave stoppen en draft opruimen: de definitieve save neemt het over.
    dirtyRef.current = false;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
    try {
      localStorage.removeItem(startKey);
      localStorage.removeItem(draftKey);
    } catch {}
    startTransition(() => {
      void saveWorkout(sessionId, flattenGroups(groups), notes, secs);
    });
  }

  const completedCount = groups.reduce(
    (n, g) => n + g.sets.filter((s) => s.completed).length,
    0,
  );
  const totalSets = groups.reduce((n, g) => n + g.sets.length, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Enkel dit gedeelte scrollt — de onderbalk blijft altijd staan. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
              ← {t("nav.routines")}
            </Link>
          </div>

          {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-faint">
          {t("wk.noExercises")}
        </p>
      )}

      {groups.map((g, gi) => (
        <section key={g.exerciseId + gi} className="card">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <button
              type="button"
              onClick={() => openDetail(g.exerciseId)}
              title={t("wk.viewExercise")}
              className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line transition hover:ring-primary"
            >
              {g.image ? (
                <>
                  <Image src={g.image} alt={g.name} fill sizes="40px" className="object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition group-hover:bg-black/40 group-hover:text-white">
                    🔍
                  </span>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center">🏋️</div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => openDetail(g.exerciseId)}
                className="block max-w-full truncate text-left font-semibold hover:text-primary"
              >
                {g.name}
              </button>
              {g.unilateral && (
                <span className="text-[11px] font-medium text-amber-400">
                  🫱 {t("wk.perSide")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSwapIdx(gi)}
              title={t("wk.swap")}
              className="shrink-0 rounded-lg border border-line px-2 py-1.5 text-xs text-muted transition hover:border-primary hover:text-primary"
            >
              ↔
            </button>
            <button
              type="button"
              onClick={() => startRest(g.restSeconds ?? restDuration)}
              title={t("wk.startRest")}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
            >
              ⏱ {fmtTime(g.restSeconds ?? restDuration)}
            </button>
          </header>

          {g.suggestion && g.suggestion.kind === "up" && (
            <div className="border-b border-line bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-300">
              💡 {t("wk.progressHint")}{" "}
              <span className="font-bold tabular-nums">
                {g.suggestion.weight} {unit}
              </span>{" "}
              <span className="text-emerald-400/80">(+{g.suggestion.delta})</span>
            </div>
          )}

          <div className="space-y-1.5 p-3 sm:p-4">
            <div className="grid grid-cols-[1.5rem_3.25rem_1fr_1fr_2.25rem_2.5rem] items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-faint">
              <span>{t("wk.set")}</span>
              <span>{t("wk.previous")}</span>
              <span>{t("wk.reps")}</span>
              <span>{unit}</span>
              <span className="text-center">RIR</span>
              <span></span>
            </div>

            {g.sets.map((s, si) => {
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
                  className={`grid grid-cols-[1.5rem_3.25rem_1fr_1fr_2.25rem_2.5rem] items-center gap-1.5 rounded-lg py-1 transition-colors ${
                    s.completed ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : ""
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
                  <NumInput
                    value={s.reps}
                    placeholder={s.setType === "warmup" ? undefined : g.repTarget ?? undefined}
                    onChange={(v) => updateSet(gi, si, "reps", v)}
                  />
                  <NumInput value={s.weight} step="0.5" onChange={(v) => updateSet(gi, si, "weight", v)} />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={s.rir}
                    onChange={(e) => updateSet(gi, si, "rir", e.target.value)}
                    placeholder="–"
                    title="RIR (reps in reserve) — optioneel"
                    className="w-full rounded-md border border-line bg-canvas px-0.5 py-2 text-center text-sm font-bold tabular-nums focus:border-primary focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => toggleComplete(gi, si)}
                      aria-label="Set afvinken"
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold transition active:scale-95 ${
                        s.completed
                          ? "animate-pop bg-emerald-500 text-white shadow-[0_0_0_3px_rgb(16_185_129_/_0.18)]"
                          : "bg-surface2 text-faint hover:text-fg"
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => addSet(gi)}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Set
              </button>
              <button
                type="button"
                onClick={() => addWarmup(gi)}
                className="text-sm font-medium text-amber-400 hover:underline"
              >
                + {t("wk.warmup")}
              </button>
              {g.sets.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeSet(gi, g.sets.length - 1)}
                  className="ml-auto text-xs text-faint hover:text-primary"
                >
                  − Set
                </button>
              )}
            </div>
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="w-full rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
      >
        {t("wk.addExercise")}
      </button>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("wk.notesPh")}
        rows={3}
        className="w-full card-flat px-4 py-3 placeholder:text-faint focus:border-primary focus:outline-none"
      />
        </div>
      </div>

      {/* Rusttimer-balk (boven de onderbalk, altijd zichtbaar) */}
      {restLeft !== null && (
        <div className="border-t border-sky-500/30 bg-sky-500/15 px-4 py-2.5">
          <div className="mx-auto flex max-w-3xl items-center gap-2 sm:gap-3">
            <span className="mr-auto text-sm font-medium text-sky-200">
              {t("wk.rest")}:{" "}
              <span className="tabular-nums text-base font-bold">{fmtTime(restLeft)}</span>
              {restPaused && <span className="ml-1 text-xs">⏸</span>}
            </span>
            <button type="button" onClick={() => adjustRest(-15)} className="rounded-lg bg-sky-500/20 px-3 py-2 text-xs font-medium text-sky-100 active:scale-95">
              −15
            </button>
            <button type="button" onClick={() => adjustRest(15)} className="rounded-lg bg-sky-500/20 px-3 py-2 text-xs font-medium text-sky-100 active:scale-95">
              +15
            </button>
            {restPaused ? (
              <button type="button" onClick={resumeRest} className="rounded-lg bg-sky-500/30 px-3 py-2 text-xs font-semibold text-sky-50 active:scale-95">
                ▶ {t("wk.resume")}
              </button>
            ) : (
              <button type="button" onClick={pauseRest} className="rounded-lg bg-sky-500/30 px-3 py-2 text-xs font-semibold text-sky-50 active:scale-95">
                ⏸ {t("wk.pause")}
              </button>
            )}
            <button type="button" onClick={stopRest} className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white active:scale-95">
              {t("wk.stop")}
            </button>
          </div>
        </div>
      )}

      {/* Onderbalk: start/stop workout (blijft altijd onderaan staan) */}
      <div
        className="border-t border-line bg-canvas"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Dunne voortgangsbalk: afgevinkte sets t.o.v. totaal. */}
        {running && totalSets > 0 && (
          <div className="h-0.5 w-full bg-surface2">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${Math.round((completedCount / totalSets) * 100)}%` }}
            />
          </div>
        )}
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
              · <span className="tabular-nums">{completedCount}/{totalSets}</span> {t("wk.setsDone")}
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
      {showAdd && (
        <ExercisePicker
          onPick={addExercise}
          onClose={() => setShowAdd(false)}
        />
      )}
      {swapIdx !== null && (
        <ExercisePicker
          onPick={swapExercise}
          onClose={() => setSwapIdx(null)}
        />
      )}
      {detailEx && (
        <ExerciseDetailModal exercise={detailEx} onClose={() => setDetailEx(null)} />
      )}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  step = "1",
  small = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  step?: string;
  small?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-line bg-canvas px-1 py-1.5 text-center tabular-nums placeholder:text-faint placeholder:font-normal focus:border-primary focus:outline-none ${
        small ? "text-xs" : ""
      }`}
    />
  );
}
