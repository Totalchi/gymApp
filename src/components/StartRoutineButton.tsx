"use client";

import { useState } from "react";
import { startWorkout } from "@/app/workout/actions";
import { useT } from "@/components/LangProvider";
import { DAY_TYPE_LABELS, type DayType } from "@/lib/types";

type Day = { id: string; name: string; day_type: DayType; day_order: number };

/**
 * Prominente "Start"-knop op een schemakaart. Eén dag → meteen starten;
 * meerdere dagen → kies er één in een mini-menu (zo ben je in 1-2 taps bezig).
 */
export function StartRoutineButton({
  routineId,
  days,
}: {
  routineId: string;
  days: Day[];
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  if (!days || days.length === 0) return null;

  const sorted = [...days].sort((a, b) => a.day_order - b.day_order);

  const cls =
    "btn-primary flex w-full items-center justify-center gap-1.5 py-2.5 text-sm";

  if (sorted.length === 1) {
    const d = sorted[0];
    return (
      <form action={startWorkout}>
        <input type="hidden" name="routine_id" value={routineId} />
        <input type="hidden" name="day_id" value={d.id} />
        <input type="hidden" name="day_name" value={d.name} />
        <button className={cls}>▶ {t("routine.start")}</button>
      </form>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cls}>
        ▶ {t("routine.start")}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute bottom-full z-20 mb-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-lg)]">
            {sorted.map((d) => (
              <form key={d.id} action={startWorkout}>
                <input type="hidden" name="routine_id" value={routineId} />
                <input type="hidden" name="day_id" value={d.id} />
                <input type="hidden" name="day_name" value={d.name} />
                <button className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-surface2">
                  <span className="truncate font-medium">{d.name}</span>
                  <span className="shrink-0 text-xs text-faint">
                    {DAY_TYPE_LABELS[d.day_type]}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
