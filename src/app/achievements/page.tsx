import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";

interface Badge {
  icon: string;
  metric: "workouts" | "streak" | "volume" | "sets";
  threshold: number;
}

const BADGES: Badge[] = [
  { icon: "🌱", metric: "workouts", threshold: 1 },
  { icon: "💪", metric: "workouts", threshold: 10 },
  { icon: "🏋️", metric: "workouts", threshold: 25 },
  { icon: "🥇", metric: "workouts", threshold: 50 },
  { icon: "👑", metric: "workouts", threshold: 100 },
  { icon: "🔥", metric: "streak", threshold: 3 },
  { icon: "🔥", metric: "streak", threshold: 7 },
  { icon: "⚡", metric: "streak", threshold: 14 },
  { icon: "🚀", metric: "streak", threshold: 30 },
  { icon: "🪨", metric: "volume", threshold: 50000 },
  { icon: "🏔️", metric: "volume", threshold: 250000 },
  { icon: "🌍", metric: "volume", threshold: 1000000 },
  { icon: "✅", metric: "sets", threshold: 100 },
  { icon: "📈", metric: "sets", threshold: 500 },
  { icon: "🎯", metric: "sets", threshold: 1000 },
];

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("performed_at, workout_sets(weight, reps)");
  const all = sessions ?? [];

  const totalWorkouts = all.length;
  let totalVolume = 0;
  let totalSets = 0;
  for (const s of all) {
    for (const set of (s.workout_sets ?? []) as { weight: number | null; reps: number | null }[]) {
      totalVolume += (set.weight ?? 0) * (set.reps ?? 0);
      totalSets += 1;
    }
  }
  const days = new Set(
    all.map((s) => new Date(s.performed_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cur = new Date();
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toISOString().slice(0, 10))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }

  const values = {
    workouts: totalWorkouts,
    streak,
    volume: totalVolume,
    sets: totalSets,
  };
  const fmt = (b: Badge) =>
    t(`ach.${b.metric}`).replace(
      "{n}",
      b.metric === "volume"
        ? b.threshold.toLocaleString()
        : String(b.threshold),
    );
  const badges = BADGES.map((b) => ({ ...b, earned: values[b.metric] >= b.threshold }));
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
          ← {t("nav.routines")}
        </Link>
        <h1 className="mb-1 mt-2 text-3xl font-bold">{t("ach.title")}</h1>
        <p className="mb-6 text-muted">
          {t("ach.subtitle")} · {earnedCount}/{badges.length} {t("ach.earned")}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b, i) => (
            <div
              key={i}
              className={`flex flex-col items-center rounded-2xl border p-4 text-center transition ${
                b.earned
                  ? "border-primary/40 bg-primary/5"
                  : "border-line bg-surface opacity-50 grayscale"
              }`}
            >
              <span className="text-3xl">{b.earned ? b.icon : "🔒"}</span>
              <span className="mt-1 text-sm font-medium">{fmt(b)}</span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
