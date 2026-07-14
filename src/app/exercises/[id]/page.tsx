import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { estimateOneRepMax } from "@/lib/rir";
import { strengthLevel, liftKey } from "@/lib/strength";
import { getT } from "@/lib/serverLang";
import type { Exercise } from "@/lib/types";

interface SetRow {
  weight: number | null;
  reps: number | null;
  rir: number | null;
  set_type: string;
  session: { id: string; performed_at: string; completed_at: string | null } | null;
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single();
  if (!exercise) notFound();
  const ex = exercise as Exercise;

  const { data: setsData } = await supabase
    .from("workout_sets")
    .select("weight, reps, rir, set_type, session:workout_sessions!inner(id, performed_at, completed_at)")
    .eq("exercise_id", id);
  const sets = ((setsData ?? []) as unknown as SetRow[]).filter(
    (s) => s.weight && s.reps && s.set_type !== "warmup" && s.session && s.session.completed_at,
  );

  // Records.
  let best1RM = 0,
    heaviest = 0,
    bestSetVolume = 0,
    mostReps = 0;
  const sessionVolume: Record<string, { date: string; volume: number }> = {};
  const e1rmByDay: Record<string, number> = {};
  const setRecords: Record<number, number> = {}; // reps -> max gewicht

  for (const s of sets) {
    const w = s.weight!,
      r = s.reps!;
    const e1 = estimateOneRepMax(w, r, s.rir ?? 0);
    best1RM = Math.max(best1RM, e1);
    heaviest = Math.max(heaviest, w);
    bestSetVolume = Math.max(bestSetVolume, w * r);
    mostReps = Math.max(mostReps, r);
    if (r >= 1 && r <= 12) setRecords[r] = Math.max(setRecords[r] ?? 0, w);
    const day = s.session!.performed_at.slice(0, 10);
    e1rmByDay[day] = Math.max(e1rmByDay[day] ?? 0, e1);
    const sid = s.session!.id;
    sessionVolume[sid] ??= { date: day, volume: 0 };
    sessionVolume[sid].volume += w * r;
  }

  // Krachtniveau (alleen bench/squat/deadlift), o.b.v. recentste lichaamsgewicht.
  let level = null as ReturnType<typeof strengthLevel>;
  if (liftKey(id) && best1RM) {
    const { data: bw } = await supabase
      .from("body_metrics")
      .select("weight")
      .not("weight", "is", null)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (bw?.weight) level = strengthLevel(id, best1RM, bw.weight);
  }
  const bestSessionVolume = Math.max(
    0,
    ...Object.values(sessionVolume).map((v) => v.volume),
  );

  const chart: ChartPoint[] = Object.entries(e1rmByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, val]) => ({
      label: new Date(day).toLocaleDateString(loc, { day: "numeric", month: "short" }),
      value: Math.round(val * 10) / 10,
    }));

  const sessions = Object.entries(sessionVolume)
    .sort(([, a], [, b]) => b.date.localeCompare(a.date))
    .map(([, v]) => v);

  const records = [
    { label: t("exd.rec1rm"), value: best1RM ? `${best1RM.toFixed(1)} kg` : "—" },
    { label: t("exd.recHeaviest"), value: heaviest ? `${heaviest} kg` : "—" },
    { label: t("exd.recSetVol"), value: bestSetVolume ? `${Math.round(bestSetVolume)} kg` : "—" },
    { label: t("exd.recReps"), value: mostReps || "—" },
    { label: t("exd.recSessionVol"), value: bestSessionVolume ? `${Math.round(bestSessionVolume)} kg` : "—" },
  ];

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/exercises" className="text-sm text-muted hover:text-fg">
          ← {t("nav.exercises")}
        </Link>

        <div className="mb-6 mt-2 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            {ex.image_urls?.[0] ? (
              <Image src={ex.image_urls[0]} alt={ex.name} fill sizes="80px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">🏋️</div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{ex.name}</h1>
            <p className="text-sm capitalize text-muted">
              {ex.primary_muscles.join(", ")}
              {ex.equipment ? ` · ${ex.equipment}` : ""}
            </p>
          </div>
        </div>

        {/* Records */}
        <h2 className="mb-2 font-semibold">{t("exd.records")}</h2>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {records.map((r) => (
            <div key={r.label} className="card-flat p-4">
              <p className="text-xs text-faint">{r.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{r.value}</p>
            </div>
          ))}
        </div>

        {/* Krachtniveau */}
        {level && (
          <section className="mb-6 card-flat p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{t("exd.strength")}</h2>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary ring-1 ring-primary/30">
                {level.label}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(level.progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-faint">
              {level.ratio.toFixed(2)}{t("exd.strengthHint")}
            </p>
          </section>
        )}

        {/* Set-records per rep */}
        {Object.keys(setRecords).length > 0 && (
          <section className="mb-6 card-flat p-5">
            <h2 className="mb-3 font-semibold">{t("exd.setRecords")}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Object.entries(setRecords)
                .map(([reps, w]) => ({ reps: Number(reps), w }))
                .sort((a, b) => a.reps - b.reps)
                .map(({ reps, w }) => (
                  <div key={reps} className="rounded-xl bg-surface2/60 p-2.5 text-center">
                    <p className="text-sm font-bold tabular-nums">{w} kg</p>
                    <p className="text-[11px] text-faint">{reps} {t("exd.reps")}</p>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Grafiek */}
        {chart.length >= 2 && (
          <section className="mb-6 card-flat p-5">
            <h2 className="mb-2 font-semibold">{t("exd.e1rmOverTime")}</h2>
            <LineChart points={chart} unit="" />
          </section>
        )}

        {/* Historie */}
        <h2 className="mb-2 font-semibold">{t("exd.history")}</h2>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-12 text-center text-faint">
            {t("exd.noSets")}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
              >
                <span className="text-sm">
                  {new Date(s.date).toLocaleDateString(loc, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-sm text-muted">
                  {Math.round(s.volume).toLocaleString()} kg {t("exd.volume")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Uitleg */}
        {ex.instructions.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 font-semibold">{t("exd.explanation")}</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
              {ex.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </>
  );
}
