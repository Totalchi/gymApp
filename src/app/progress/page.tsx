import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { estimateOneRepMax } from "@/lib/rir";

interface RawSet {
  exercise_id: string;
  exercise_name: string | null;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  session: { performed_at: string } | null;
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("workout_sets")
    .select(
      "exercise_id, exercise_name, reps, weight, rir, session:workout_sessions(performed_at)",
    );

  const sets = (data ?? []) as unknown as RawSet[];

  // Groepeer per oefening, en daarbinnen per dag het beste geschatte 1RM.
  const byExercise = new Map<
    string,
    { name: string; perDay: Map<string, number> }
  >();

  for (const s of sets) {
    if (!s.weight || !s.reps || !s.session) continue;
    const e1rm = estimateOneRepMax(s.weight, s.reps, s.rir ?? 0);
    if (!e1rm) continue;
    const day = s.session.performed_at.slice(0, 10);
    const entry =
      byExercise.get(s.exercise_id) ??
      { name: s.exercise_name ?? "Oefening", perDay: new Map() };
    entry.perDay.set(day, Math.max(entry.perDay.get(day) ?? 0, e1rm));
    byExercise.set(s.exercise_id, entry);
  }

  // Alleen oefeningen met minstens 2 trainingsdagen tonen, meeste data eerst.
  const charts = [...byExercise.values()]
    .filter((e) => e.perDay.size >= 2)
    .sort((a, b) => b.perDay.size - a.perDay.size)
    .slice(0, 12)
    .map((e) => {
      const points: ChartPoint[] = [...e.perDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, val]) => ({
          label: new Date(day).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "short",
          }),
          value: Math.round(val * 10) / 10,
        }));
      return { name: e.name, points };
    });

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Voortgang</h1>
          <Link
            href="/history"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-rose-500 hover:text-rose-400"
          >
            Geschiedenis
          </Link>
        </div>
        <p className="mb-6 text-slate-400">
          Geschat 1RM per oefening over tijd, berekend uit je gelogde sets.
        </p>

        {charts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center text-slate-500">
            Log minstens 2 workouts met dezelfde oefening om je voortgang te zien.
          </div>
        ) : (
          <div className="space-y-5">
            {charts.map((c) => (
              <section
                key={c.name}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="font-semibold">{c.name}</h2>
                  <span className="text-sm text-slate-400">
                    {c.points[c.points.length - 1].value} kg
                    <span className="ml-1 text-xs text-slate-500">(e1RM)</span>
                  </span>
                </div>
                <LineChart points={c.points} unit="" />
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
