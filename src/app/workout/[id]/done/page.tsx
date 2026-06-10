import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Confetti } from "@/components/Confetti";
import { getT } from "@/lib/serverLang";
import { estimateOneRepMax } from "@/lib/rir";

interface SetRow {
  exercise_id: string;
  exercise_name: string | null;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  set_type: string;
  session: { performed_at: string } | null;
}

export default async function WorkoutDonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, day_name, performed_at, duration_seconds")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: thisSets } = await supabase
    .from("workout_sets")
    .select("exercise_id, exercise_name, weight, reps, rir, set_type")
    .eq("session_id", id);
  const sets = (thisSets ?? []).filter(
    (s) => s.weight && s.reps && s.set_type !== "warmup",
  );

  // Totalen.
  let volume = 0;
  for (const s of sets) volume += (s.weight ?? 0) * (s.reps ?? 0);
  const setCount = sets.length;
  const minutes = session.duration_seconds
    ? Math.round(session.duration_seconds / 60)
    : null;

  // Beste prestatie deze sessie per oefening.
  const bestThis: Record<string, { name: string; e1rm: number; weight: number }> = {};
  for (const s of sets) {
    const e1 = estimateOneRepMax(s.weight!, s.reps!, s.rir ?? 0);
    const cur = bestThis[s.exercise_id];
    if (!cur || e1 > cur.e1rm) {
      bestThis[s.exercise_id] = {
        name: s.exercise_name ?? "Oefening",
        e1rm: e1,
        weight: Math.max(cur?.weight ?? 0, s.weight!),
      };
    } else {
      cur.weight = Math.max(cur.weight, s.weight!);
    }
  }

  // Eerdere records ophalen (alle sessies vóór deze).
  const exerciseIds = Object.keys(bestThis);
  const prevBest: Record<string, number> = {};
  if (exerciseIds.length) {
    const { data: prev } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight, reps, rir, set_type, session:workout_sessions!inner(performed_at)")
      .in("exercise_id", exerciseIds)
      .neq("session_id", id);
    for (const r of (prev ?? []) as unknown as SetRow[]) {
      if (!r.weight || !r.reps || r.set_type === "warmup" || !r.session) continue;
      if (r.session.performed_at >= session.performed_at) continue;
      const e1 = estimateOneRepMax(r.weight, r.reps, r.rir ?? 0);
      prevBest[r.exercise_id] = Math.max(prevBest[r.exercise_id] ?? 0, e1);
    }
  }

  const prs = exerciseIds
    .filter((eid) => bestThis[eid].e1rm > (prevBest[eid] ?? 0) + 0.01)
    .map((eid) => ({
      id: eid,
      name: bestThis[eid].name,
      e1rm: bestThis[eid].e1rm,
      isFirst: !(eid in prevBest),
    }));

  // Dag-streak (aaneengesloten trainingsdagen, eindigend vandaag/gisteren).
  const { data: dates } = await supabase
    .from("workout_sessions")
    .select("performed_at");
  const dayset = new Set(
    (dates ?? []).map((d) => new Date(d.performed_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cur = new Date();
  if (!dayset.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (dayset.has(cur.toISOString().slice(0, 10))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }

  return (
    <>
      <Header email={user?.email} />
      <Confetti fire={prs.length > 0} />
      <main className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="mb-3 inline-block animate-pop text-6xl">🎉</div>
        <h1 className="text-3xl font-bold tracking-tight">{t("done.title")}</h1>
        <p className="mt-1 text-muted">{session.day_name}</p>

        {streak >= 2 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
            🔥 {streak} {t("done.streakDays")}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: t("done.duration"), value: minutes != null ? `${minutes} ${t("done.min")}` : "—" },
            { label: t("done.sets"), value: setCount },
            { label: t("done.volume"), value: `${Math.round(volume).toLocaleString()} kg` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-xs text-faint">{s.label}</p>
            </div>
          ))}
        </div>

        {prs.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-left shadow-[0_8px_30px_-8px_rgb(245_158_11_/_0.35)]">
            <h2 className="mb-3 text-center font-semibold text-amber-300">
              🏆 {prs.length} {prs.length === 1 ? t("done.record") : t("done.records")}
            </h2>
            <ul className="space-y-2">
              {prs.map((pr) => (
                <li key={pr.id} className="flex items-center justify-between gap-3">
                  <Link href={`/exercises/${pr.id}`} className="truncate font-medium hover:text-amber-300">
                    {pr.name}
                  </Link>
                  <span className="shrink-0 text-sm text-amber-200">
                    {pr.isFirst ? t("done.firstTime") : `${pr.e1rm.toFixed(1)} kg e1RM`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/history"
            className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-fg transition hover:brightness-110"
          >
            {t("done.toHistory")}
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-line px-6 py-2.5 font-medium text-fg transition hover:bg-surface2"
          >
            {t("done.dashboard")}
          </Link>
        </div>
      </main>
    </>
  );
}
