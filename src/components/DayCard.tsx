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
import { deleteDay, reorderExercises } from "@/app/routines/actions";
import { startWorkout } from "@/app/workout/actions";
import {
  DAY_TYPE_COLORS,
  DAY_TYPE_LABELS,
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

  useEffect(() => setExercises(day.exercises), [day.exercises]);

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
      className="rounded-2xl border border-slate-800 bg-slate-900/50"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {sortable && (
            <DragHandle attributes={attributes} listeners={listeners} />
          )}
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[day.day_type]}`}
          >
            {DAY_TYPE_LABELS[day.day_type]}
          </span>
          <h2 className="truncate text-lg font-semibold">{day.name}</h2>
          <span className="hidden text-sm text-slate-500 sm:inline">
            {exercises.length}{" "}
            {exercises.length === 1 ? "oefening" : "oefeningen"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {exercises.length > 0 && (
            <form action={startWorkout}>
              <input type="hidden" name="routine_id" value={routineId} />
              <input type="hidden" name="day_id" value={day.id} />
              <input type="hidden" name="day_name" value={day.name} />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                ▶ Start
              </button>
            </form>
          )}
          <form action={deleteDay}>
            <input type="hidden" name="id" value={day.id} />
            <input type="hidden" name="routine_id" value={routineId} />
            <button
              type="submit"
              className="text-xs text-slate-500 transition hover:text-rose-400"
            >
              Verwijderen
            </button>
          </form>
        </div>
      </header>

      <div>
        {exercises.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">
            Nog geen oefeningen op deze dag.
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
              <div className="divide-y divide-slate-800">
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
