"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExerciseRow } from "@/components/ExerciseRow";
import { ExercisePicker } from "@/components/ExercisePicker";
import { DragHandle } from "@/components/DragHandle";
import { deleteDay, reorderExercises, setDayWeekday } from "@/app/routines/actions";
import { startWorkout } from "@/app/workout/actions";
import { useT } from "@/components/LangProvider";
import {
  DAY_TYPE_COLORS,
  DAY_TYPE_LABELS,
  WEEKDAY_KEYS,
  type RoutineDayWithExercises,
} from "@/lib/types";

export function DayCard({
  day,
  routineId,
  sortable = false,
}: {
  day: RoutineDayWithExercises;
  routineId: string;
  sortable?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exercises, setExercises] = useState(day.exercises);
  const [collapsed, setCollapsed] = useState(false);
  const t = useT();

  useEffect(() => setExercises(day.exercises), [day.exercises]);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(`daycollapse-${day.id}`) === "1");
    } catch {}
  }, [day.id]);

  function toggleCollapse() {
    setCollapsed((c) => {
      const n = !c;
      try {
        localStorage.setItem(`daycollapse-${day.id}`, n ? "1" : "0");
      } catch {}
      return n;
    });
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id, disabled: !sortable });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onExerciseDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    const next = arrayMove(exercises, oldIndex, newIndex);
    setExercises(next);
    void reorderExercises(routineId, day.id, next.map((e) => e.id));
  }

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="rounded-2xl border border-line bg-surface shadow-[var(--shadow)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {sortable && (
            <DragHandle attributes={attributes} listeners={listeners} />
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Uitklappen" : "Inklappen"}
            className="shrink-0 text-faint transition hover:text-fg"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[day.day_type]}`}
          >
            {DAY_TYPE_LABELS[day.day_type]}
          </span>
          <button
            type="button"
            onClick={toggleCollapse}
            className="truncate text-left text-lg font-semibold"
          >
            {day.name}
          </button>
          <span className="hidden text-sm text-faint sm:inline">
            {exercises.length}{" "}
            {exercises.length === 1 ? t("routine.exercise") : t("routine.exercises")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <form action={setDayWeekday}>
            <input type="hidden" name="id" value={day.id} />
            <input type="hidden" name="routine_id" value={routineId} />
            <select
              name="weekday"
              defaultValue={day.weekday ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              title={t("plan.weekdayHint")}
              className="rounded-lg border border-line bg-canvas px-1.5 py-1 text-xs text-muted focus:outline-none"
            >
              <option value="">{t("plan.noDay")}</option>
              {WEEKDAY_KEYS.map((k, i) => (
                <option key={k} value={i}>
                  {t(`wd.${k}`)}
                </option>
              ))}
            </select>
          </form>
          {exercises.length > 0 && (
            <form action={startWorkout}>
              <input type="hidden" name="routine_id" value={routineId} />
              <input type="hidden" name="day_id" value={day.id} />
              <input type="hidden" name="day_name" value={day.name} />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                ▶ {t("routine.start")}
              </button>
            </form>
          )}
          <form action={deleteDay}>
            <input type="hidden" name="id" value={day.id} />
            <input type="hidden" name="routine_id" value={routineId} />
            <button
              type="submit"
              onClick={(e) => {
                if (!confirm(t("routine.confirmDeleteDay"))) e.preventDefault();
              }}
              className="text-xs text-faint transition hover:text-danger"
            >
              {t("routine.deleteDay")}
            </button>
          </form>
        </div>
      </header>

      {!collapsed && (
      <>
      <div>
        {exercises.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-faint">
            {t("routine.noExercises")}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onExerciseDragEnd}
          >
            <SortableContext
              items={exercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-line">
                {exercises.map((ex) => (
                  <ExerciseRow key={ex.id} item={ex} routineId={routineId} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="px-5 py-4">
        <button
          onClick={() => setPickerOpen(true)}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-fg transition hover:border-primary hover:text-primary"
        >
          {t("routine.addExercise")}
        </button>
      </div>
      </>
      )}

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
