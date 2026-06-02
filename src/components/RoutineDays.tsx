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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DayCard } from "@/components/DayCard";
import { reorderDays } from "@/app/routines/actions";
import type { RoutineDayWithExercises } from "@/lib/types";

export function RoutineDays({
  days: initialDays,
  routineId,
}: {
  days: RoutineDayWithExercises[];
  routineId: string;
}) {
  const [days, setDays] = useState(initialDays);

  // Houd lokale volgorde in sync met server (na revalidate).
  useEffect(() => setDays(initialDays), [initialDays]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = days.findIndex((d) => d.id === active.id);
    const newIndex = days.findIndex((d) => d.id === over.id);
    const next = arrayMove(days, oldIndex, newIndex);
    setDays(next);
    void reorderDays(routineId, next.map((d) => d.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={days.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-5">
          {days.map((day) => (
            <DayCard key={day.id} day={day} routineId={routineId} sortable />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
