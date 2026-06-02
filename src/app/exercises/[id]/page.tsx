import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { estimateOneRepMax } from "@/lib/rir";
import type { Exercise } from "@/lib/types";

interface SetRow {
  weight: number | null;
  reps: number | null;
  rir: number | null;
  set_type: string;
  session: { id: string; performed_at: string } | null;
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

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single();
  if (!exercise) notFound();
  const ex = exercise as Exercise;

  const { data: setsData } = await supabase
    .from("workout_sets")
    .select("weight, reps, rir, set_type, session:workout_sessions!inner(id, performed_at)")
    .eq("exercise_id", id);
  const sets = ((setsData ?? []) as unknown as SetRow[]).filter(
    (s) => s.weight && s.reps && s.set_type !== "warmup" && s.session,
  );

  // Records.
  let best1RM = 0,
    heaviest = 0,
    bestSetVolume = 0,
    mostReps = 0;
  const sessionVolume: Record<string, { date: string; volume: number }> = {};
  const e1rmByDay: Record<string, number> = {};

  for (const s of sets) {
    const w = s.weight!,
      r = s.reps!;
    const e1 = estimateOneRepMax(w, r, s.rir ?? 0);
    best1RM = Math.max(best1RM, e1);
    heaviest = Math.max(heaviest, w);
    bestSetVolume = Math.max(bestSetVolume, w * r);
    mostReps = Math.max(mostReps, r);
    const day = s.session!.performed_at.slice(0, 10);
    e1rmByDay[day] = Math.max(e1rmByDay[day] ?? 0, e1);
    const sid = s.session!.id;
    sessionVolume[sid] ??= { date: day, volume: 0 };
    sessionVolume[sid].volume += w * r;
  }
  const bestSessionVolume = Math.max(
    0,
    ...Object.values(sessionVolume).map((v) => v.volume),
  );

  const chart: ChartPoint[] = Object.entries(e1rmByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, val]) => ({
      label: new Date(day).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
      value: Math.round(val * 10) / 10,
    }));

  const sessions = Object.entries(sessionVolume)
    .sort(([, a], [, b]) => b.date.localeCompare(a.date))
    .map(([, v]) => v);

  const records = [
    { label: "Geschat 1RM", value: best1RM ? `${best1RM.toFixed(1)} kg` : "—" },
    { label: "Zwaarste gewicht", value: heaviest ? `${heaviest} kg` : "—" },
    { label: "Beste set-volume", value: bestSetVolume ? `${Math.round(bestSetVolume)} kg` : "—" },
    { label: "Meeste reps", value: mostReps || "—" },
    { label: "Beste sessie-volume", value: bestSessionVolume ? `${Math.round(bestSessionVolume)} kg` : "—" },
  ];

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/exercises" className="text-sm text-slate-400 hover:text-white">
          ← Oefeningen
        </Link>

        <div className="mb-6 mt-2 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-700">
            {ex.image_urls?.[0] ? (
              <Image src={ex.image_urls[0]} alt={ex.name} fill sizes="80px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">🏋️</div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{ex.name}</h1>
            <p className="text-sm capitalize text-slate-400">
              {ex.primary_muscles.join(", ")}
              {ex.equipment ? ` · ${ex.equipment}` : ""}
            </p>
          </div>
        </div>

        {/* Records */}
        <h2 className="mb-2 font-semibold">Persoonlijke records 🏆</h2>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {records.map((r) => (
            <div key={r.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs text-slate-500">{r.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{r.value}</p>
            </div>
          ))}
        </div>

        {/* Grafiek */}
        {chart.length >= 2 && (
          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="mb-2 font-semibold">Geschat 1RM over tijd</h2>
            <LineChart points={chart} unit="" />
          </section>
        )}

        {/* Historie */}
        <h2 className="mb-2 font-semibold">Historie</h2>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 py-12 text-center text-slate-500">
            Nog geen gelogde sets voor deze oefening.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <span className="text-sm">
                  {new Date(s.date).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-sm text-slate-400">
                  {Math.round(s.volume).toLocaleString("nl-NL")} kg volume
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Uitleg */}
        {ex.instructions.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 font-semibold">Uitleg</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
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
