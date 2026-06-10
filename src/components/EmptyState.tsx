import type { ReactNode } from "react";

/** Uniforme, vriendelijke lege staat: icoon + titel + (optioneel) hint/actie. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-14 text-center">
      <div className="text-5xl">{icon}</div>
      <p className="mt-4 font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
