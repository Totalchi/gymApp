"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  updateRoutineExercise,
  deleteRoutineExercise,
  toggleSuperset,
  swapRoutineExercise,
} from "@/app/routines/actions";
import { DragHandle } from "@/components/DragHandle";
import { ExerciseDetailModal } from "@/components/ExerciseDetailModal";
import { ExercisePicker } from "@/components/ExercisePicker";
import { useUnit } from "@/components/UnitProvider";
import { useT } from "@/components/LangProvider";
import type { Exercise, RoutineExerciseWithExercise } from "@/lib/types";

export function ExerciseRow({
  item,
  routineId,
}: {
  item: RoutineExerciseWithExercise;
  routineId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const [sets, setSets] = useState(String(item.sets));
  // Reps: één veld dat ook een bereik aankan, bv. "6-8".
  const [reps, setReps] = useState(
    item.reps_max != null && item.reps_max !== item.reps
      ? `${item.reps}-${item.reps_max}`
      : String(item.reps),
  );
  const [weight, setWeight] = useState(item.weight != null ? String(item.weight) : "");
  const [restStr, setRestStr] = useState(item.rest ?? "");
  // RIR: één veld dat ook een bereik aankan, bv. "2-3".
  const [rirInput, setRirInput] = useState(
    item.rir_max != null && item.rir_max !== item.rir
      ? `${item.rir}-${item.rir_max}`
      : item.rir != null
        ? String(item.rir)
        : "",
  );
  const [notes, setNotes] = useState(item.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const unit = useUnit();
  const t = useT();

  useEffect(() => setMounted(true), []);

  function onSwap(ex: Exercise) {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("routine_id", routineId);
    fd.set("exercise_id", ex.id);
    void swapRoutineExercise(fd);
    setSwapOpen(false);
  }

  const img = item.exercise.image_urls?.[0];

  // Handmatige RIR (voor de kleur van de badge).
  const shownRir = rirInput !== "" ? parseFloat(rirInput.replace(",", ".")) : null;

  return (
    <form
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      action={updateRoutineExercise}
      onSubmit={() => setDirty(false)}
      className={`bg-surface px-4 py-4 sm:px-5 ${
        item.superset_group != null ? "border-l-2 border-l-sky-500" : ""
      }`}
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="routine_id" value={routineId} />
      <input type="hidden" name="day_id" value={item.day_id} />
      <input type="hidden" name="notes" value={notes} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Afbeelding (klikbaar) + naam */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <DragHandle attributes={attributes} listeners={listeners} />
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          title="Klik om de foto en uitleg te bekijken"
          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line transition hover:ring-primary"
        >
          {img ? (
            <>
              <Image
                src={img}
                alt={item.exercise.name}
                fill
                sizes="56px"
                className="object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition group-hover:bg-black/40 group-hover:text-fg">
                🔍
              </span>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl">
              🏋️
            </div>
          )}
        </button>
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="truncate text-left font-medium hover:text-primary"
          >
            {item.exercise.name}
          </button>
          <p className="truncate text-xs text-faint">
            {item.exercise.primary_muscles.join(", ")}
            {item.exercise.equipment ? ` · ${item.exercise.equipment}` : ""}
          </p>
        </div>
      </div>

      {/* Velden */}
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <NumField label="Sets" name="sets" value={sets} onChange={(v) => { setSets(v); setDirty(true); }} />
        {/* Reps: één veld, enkel getal of bereik (bv. 6-8) */}
        <label className="flex flex-col">
          <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
            Reps
          </span>
          <input
            name="reps"
            type="text"
            value={reps}
            onChange={(e) => { setReps(e.target.value); setDirty(true); }}
            placeholder="6-8"
            title="Eén getal of een bereik, bv. 6-8"
            className="h-11 w-16 rounded-lg border border-line bg-canvas px-2 text-center text-base tabular-nums focus:border-primary focus:outline-none"
          />
        </label>
        <NumField label={unit} name="weight" value={weight} onChange={(v) => { setWeight(v); setDirty(true); }} step="0.5" />

        {/* Rusttijd: één vrij tekstveld, bv. "2-3 min" of "60-90 sec" */}
        <label className="flex flex-col">
          <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
            {t("routine.rest")}
          </span>
          <input
            name="rest"
            type="text"
            value={restStr}
            onChange={(e) => { setRestStr(e.target.value); setDirty(true); }}
            placeholder={t("routine.restPh")}
            title={t("routine.restPh")}
            className="h-11 w-28 rounded-lg border border-line bg-canvas px-2 text-center text-base focus:border-primary focus:outline-none"
          />
        </label>

        {/* RIR: zelf invulbaar */}
        <label className="flex flex-col">
          <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
            RIR
          </span>
          <input
            name="rir"
            type="text"
            value={rirInput}
            onChange={(e) => { setRirInput(e.target.value); setDirty(true); }}
            placeholder="2-3"
            title="Eén getal of een bereik, bv. 2-3"
            style={shownRir != null && !Number.isNaN(shownRir) ? rirStyle(shownRir) : undefined}
            className="h-11 w-16 rounded-lg border border-line bg-canvas px-2 text-center text-base font-semibold tabular-nums focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      {/* Acties */}
      <div className="flex items-center gap-3 sm:flex-col">
        <button
          type="submit"
          disabled={!dirty}
          className={`h-11 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-40 ${
            dirty
              ? "bg-primary text-primary-fg hover:brightness-110"
              : "border border-line text-faint"
          }`}
        >
          {dirty ? t("common.save") : t("common.saved")}
        </button>
        <button
          type="button"
          onClick={() => setSwapOpen(true)}
          title={t("routine.swapHint")}
          className="px-1 py-1 text-sm text-faint transition hover:text-primary"
        >
          {t("routine.swap")}
        </button>
        <button
          type="submit"
          formAction={deleteRoutineExercise}
          className="px-1 py-1 text-sm text-faint transition hover:text-danger"
        >
          {t("common.delete")}
        </button>
      </div>
      </div>

      {/* Notitie per oefening (blijft bewaard) */}
      <input
        type="text"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDirty(true);
        }}
        placeholder={t("routine.notePh")}
        className="mt-3 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm placeholder:text-faint focus:border-primary focus:outline-none"
      />

      <button
        type="submit"
        formAction={toggleSuperset}
        className={`mt-2 text-xs transition hover:text-sky-300 ${
          item.superset_group != null ? "text-sky-400" : "text-faint"
        }`}
        title="Koppel deze oefening als superset met de oefening erboven"
      >
        🔗 {item.superset_group != null ? t("routine.supersetLinked") : t("routine.supersetWithPrev")}
      </button>

      {showDetail && (
        <ExerciseDetailModal
          exercise={item.exercise}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* Picker via portal: buiten dit <form> zodat zoeken niet de rij opslaat. */}
      {swapOpen &&
        mounted &&
        createPortal(
          <ExercisePicker onPick={onSwap} onClose={() => setSwapOpen(false)} />,
          document.body,
        )}
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
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
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
        className="h-11 w-16 rounded-lg border border-line bg-canvas px-2 text-center text-base tabular-nums focus:border-primary focus:outline-none"
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
