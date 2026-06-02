"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";

/** Sleep-handvat voor dnd-kit (werkt met muis, touch en toetsenbord). */
export function DragHandle({
  attributes,
  listeners,
}: {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}) {
  return (
    <button
      type="button"
      aria-label="Versleep om te herordenen"
      className="-ml-1 cursor-grab touch-none rounded-md px-1 py-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="5" cy="3" r="1.4" />
        <circle cx="11" cy="3" r="1.4" />
        <circle cx="5" cy="8" r="1.4" />
        <circle cx="11" cy="8" r="1.4" />
        <circle cx="5" cy="13" r="1.4" />
        <circle cx="11" cy="13" r="1.4" />
      </svg>
    </button>
  );
}
