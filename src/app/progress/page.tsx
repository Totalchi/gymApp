import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { estimateOneRepMax } from "@/lib/rir";
import { getT } from "@/lib/serverLang";

interface RawSet {
  exercise_id: string;
  exercise_name: string | null;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  session: { performed_at: string } | null;
}

const RANGES: { key: string; days: number | null }[] = [
  { key: "30d", days: 30 },
  { key: "3m", days: 90 },
  { key: "1y", days: 365 },
  { key: "all", days: null },
];

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  const { range = "3m" } = await searchParams;
  const days = (RANGES.find((r) => r.key === range) ?? RANGES[1]).days;
  const cutoff = days != null ? new Date(Date.now() - days * 864e5).toISOString() : null;

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
    if (cutoff && s.session.performed_at < cutoff) continue;
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
          label: new Date(day).toLocaleDateString(loc, {
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
          <h1 className="text-3xl font-bold">{t("prog.title")}</h1>
          <Link
            href="/history"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg transition hover:border-primary hover:text-primary"
          >
            {t("nav.history")}
          </Link>
        </div>
        <p className="mb-4 text-muted">{t("prog.subtitle")}</p>

        {/* Tijdsbereik-filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/progress?range=${r.key}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                range === r.key
                  ? "bg-primary text-primary-fg ring-primary"
                  : "text-muted ring-line hover:bg-surface2"
              }`}
            >
              {t(`range.${r.key}`)}
            </Link>
          ))}
        </div>

        {charts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-faint">
            {t("prog.empty")}
          </div>
        ) : (
          <div className="space-y-5">
            {charts.map((c) => (
              <section
                key={c.name}
                className="card-flat p-5"
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="font-semibold">{c.name}</h2>
                  <span className="text-sm text-muted">
                    {c.points[c.points.length - 1].value} kg
                    <span className="ml-1 text-xs text-faint">(e1RM)</span>
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
