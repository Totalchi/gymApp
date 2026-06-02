import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    if (v <= 0) return "bg-slate-800";
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
          <h1 className="text-3xl font-bold">Statistieken</h1>
          <a
            href="/api/export"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-rose-500 hover:text-rose-400"
          >
            ⬇ Export CSV
          </a>
        </div>

        {/* Kalender */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-3 font-semibold">Trainingskalender</h2>
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
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>minder</span>
            <span className="h-3 w-3 rounded-sm bg-slate-800" />
            <span className="h-3 w-3 rounded-sm bg-emerald-900" />
            <span className="h-3 w-3 rounded-sm bg-emerald-700" />
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="h-3 w-3 rounded-sm bg-emerald-400" />
            <span>meer</span>
          </div>
        </section>

        {/* Spiergroep-verdeling */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-3 font-semibold">Volume per spiergroep</h2>
          {muscles.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nog geen gelogde sets.{" "}
              <Link href="/dashboard" className="text-rose-400 hover:underline">
                Start een workout
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {muscles.map(([muscle, vol]) => (
                <div key={muscle} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-right text-xs capitalize text-slate-400">
                    {muscle}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500"
                      style={{ width: `${Math.max(3, (vol / maxMuscle) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-slate-500">
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
