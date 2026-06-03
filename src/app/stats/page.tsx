import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { getT } from "@/lib/serverLang";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  // Sessies + sets voor kalender en volume.
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("performed_at, workout_sets(weight, reps)");

  const dayVolume: Record<string, number> = {};
  for (const s of sessions ?? []) {
    const day = new Date(s.performed_at).toISOString().slice(0, 10);
    let v = 0;
    for (const set of (s.workout_sets ?? []) as { weight: number | null; reps: number | null }[]) {
      v += (set.weight ?? 0) * (set.reps ?? 0);
    }
    dayVolume[day] = (dayVolume[day] ?? 0) + v;
  }

  // Per week: totaal volume + aantal workouts (laatste 12 weken, maandag-start).
  const weekStart = (d: Date) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const WEEKN = 12;
  const weeks: { label: string; volume: number; count: number }[] = [];
  const weekIdx = new Map<string, number>();
  const thisWeekStart = weekStart(new Date());
  for (let i = WEEKN - 1; i >= 0; i--) {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() - i * 7);
    weekIdx.set(d.toISOString().slice(0, 10), weeks.length);
    weeks.push({
      label: d.toLocaleDateString(loc, { day: "numeric", month: "short" }),
      volume: 0,
      count: 0,
    });
  }
  for (const s of sessions ?? []) {
    const key = weekStart(new Date(s.performed_at)).toISOString().slice(0, 10);
    const idx = weekIdx.get(key);
    if (idx == null) continue;
    let v = 0;
    for (const set of (s.workout_sets ?? []) as { weight: number | null; reps: number | null }[]) {
      v += (set.weight ?? 0) * (set.reps ?? 0);
    }
    weeks[idx].volume += v;
    weeks[idx].count += 1;
  }
  const volumePoints: ChartPoint[] = weeks.map((w) => ({
    label: w.label,
    value: Math.round(w.volume),
  }));
  const maxWeekCount = Math.max(1, ...weeks.map((w) => w.count));
  const hasWeekData = weeks.some((w) => w.count > 0);

  // Spiergroep-verdeling op basis van set-volume.
  const { data: setRows } = await supabase
    .from("workout_sets")
    .select("weight, reps, exercise:exercises(primary_muscles)");
  const muscleVolume: Record<string, number> = {};
  for (const r of (setRows ?? []) as unknown as {
    weight: number | null;
    reps: number | null;
    exercise: { primary_muscles: string[] } | null;
  }[]) {
    const v = (r.weight ?? 0) * (r.reps ?? 0);
    if (!v || !r.exercise) continue;
    for (const m of r.exercise.primary_muscles ?? []) {
      muscleVolume[m] = (muscleVolume[m] ?? 0) + v;
    }
  }
  const muscles = Object.entries(muscleVolume).sort(([, a], [, b]) => b - a);
  const maxMuscle = muscles[0]?.[1] ?? 1;

  // Kalender: laatste 16 weken (start op maandag).
  const WEEKS = 16;
  const today = new Date();
  const end = new Date(today);
  // Naar zondag van deze week toe (eind van het raster).
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  const start = new Date(end);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));

  const columns: { date: string; volume: number }[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: string; volume: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10);
      col.push({ date: key, volume: dayVolume[key] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }

  const cellColor = (v: number) => {
    if (v <= 0) return "bg-surface2";
    if (v < 2000) return "bg-emerald-900";
    if (v < 5000) return "bg-emerald-700";
    if (v < 9000) return "bg-emerald-500";
    return "bg-emerald-400";
  };

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("stats.title")}</h1>
          <a
            href="/api/export"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg transition hover:border-primary hover:text-primary"
          >
            {t("stats.export")}
          </a>
        </div>

        {/* Kalender */}
        <section className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-semibold">{t("stats.calendar")}</h2>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-1">
                {col.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${Math.round(cell.volume).toLocaleString("nl-NL")} kg`}
                    className={`h-3.5 w-3.5 rounded-sm ${cellColor(cell.volume)}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-faint">
            <span>{t("stats.less")}</span>
            <span className="h-3 w-3 rounded-sm bg-surface2" />
            <span className="h-3 w-3 rounded-sm bg-emerald-900" />
            <span className="h-3 w-3 rounded-sm bg-emerald-700" />
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="h-3 w-3 rounded-sm bg-emerald-400" />
            <span>{t("stats.more")}</span>
          </div>
        </section>

        {/* Volume + workouts per week */}
        {hasWeekData && (
          <>
            <section className="mb-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-2 font-semibold">{t("stats.weeklyVolume")}</h2>
              <LineChart points={volumePoints} unit="" />
            </section>

            <section className="mb-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-3 font-semibold">{t("stats.workoutsPerWeek")}</h2>
              <div className="flex h-28 items-end justify-between gap-1">
                {weeks.map((w, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] tabular-nums text-faint">
                      {w.count || ""}
                    </span>
                    <div
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${(w.count / maxWeekCount) * 80}px` }}
                    />
                    <span className="text-[9px] text-faint">{w.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Spiergroep-verdeling */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-semibold">{t("stats.volumePerMuscle")}</h2>
          {muscles.length === 0 ? (
            <p className="text-sm text-faint">
              {t("stats.noSets")}{" "}
              <Link href="/dashboard" className="text-primary hover:underline">
                {t("stats.startWorkout")}
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {muscles.map(([muscle, vol]) => (
                <div key={muscle} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-right text-xs capitalize text-muted">
                    {muscle}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(3, (vol / maxMuscle) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-faint">
                    {Math.round(vol / 1000)}k
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
