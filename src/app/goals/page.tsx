import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { GoalForm } from "@/components/GoalForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { getT } from "@/lib/serverLang";
import { deleteGoal } from "@/app/goals/actions";
import { estimateOneRepMax } from "@/lib/rir";
import type { Goal } from "@/lib/types";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  const { data: goalsData } = await supabase
    .from("goals")
    .select("*")
    .order("created_at");
  const goals = (goalsData ?? []) as Goal[];

  // Huidig lichaamsgewicht.
  const { data: bw } = await supabase
    .from("body_metrics")
    .select("weight")
    .not("weight", "is", null)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentBw = bw?.weight ?? null;

  // Beste geschat 1RM per gelogde oefening.
  const { data: setsData } = await supabase
    .from("workout_sets")
    .select("exercise_id, exercise_name, weight, reps, rir, set_type");
  const best1rm: Record<string, number> = {};
  const nameById: Record<string, string> = {};
  for (const s of (setsData ?? []) as {
    exercise_id: string;
    exercise_name: string | null;
    weight: number | null;
    reps: number | null;
    rir: number | null;
    set_type: string;
  }[]) {
    if (!s.weight || !s.reps || s.set_type === "warmup") continue;
    const e1 = estimateOneRepMax(s.weight, s.reps, s.rir ?? 0);
    best1rm[s.exercise_id] = Math.max(best1rm[s.exercise_id] ?? 0, e1);
    if (s.exercise_name) nameById[s.exercise_id] = s.exercise_name;
  }
  const loggedExercises = Object.keys(nameById)
    .map((id) => ({ id, name: nameById[id] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Namen voor doel-oefeningen die nog niet in de logs zaten.
  const missingIds = goals
    .filter((g) => g.kind === "lift" && g.exercise_id && !nameById[g.exercise_id])
    .map((g) => g.exercise_id as string);
  if (missingIds.length) {
    const { data: ex } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", missingIds);
    for (const e of ex ?? []) nameById[e.id as string] = e.name as string;
  }

  function progressFor(g: Goal): { current: number | null; label: string } {
    if (g.kind === "bodyweight")
      return { current: currentBw, label: t("goals.bodyweight") };
    const cur = g.exercise_id ? (best1rm[g.exercise_id] ?? 0) : 0;
    return { current: cur, label: g.exercise_id ? (nameById[g.exercise_id] ?? "Oefening") : "—" };
  }

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("goals.title")}</h1>
        <p className="mb-6 text-muted">{t("goals.subtitle")}</p>

        <GoalForm exercises={loggedExercises} />

        {goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-12 text-center text-faint">
            {t("goals.none")}
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const { current, label } = progressFor(g);
              const pct =
                current != null && g.target > 0
                  ? Math.min(100, Math.round((current / g.target) * 100))
                  : 0;
              const reached = current != null && current >= g.target;
              return (
                <div key={g.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="truncate font-medium">{label}</p>
                    <form action={deleteGoal}>
                      <input type="hidden" name="id" value={g.id} />
                      <ConfirmButton
                        message={t("confirm.goal")}
                        confirmLabel={t("common.delete")}
                        cancelLabel={t("common.cancel")}
                        className="text-xs text-faint transition hover:text-danger"
                      >
                        {t("common.delete")}
                      </ConfirmButton>
                    </form>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-faint">
                    {reached ? (
                      <span className="font-semibold text-emerald-400">{t("goals.reached")}</span>
                    ) : (
                      <>
                        {t("goals.current")}: {current != null ? `${current.toFixed(1)} kg` : "—"} ·{" "}
                        {t("goals.target")}: {g.target} kg
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
