import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { parseRestToSeconds } from "@/lib/rest";
import {
  WorkoutLogger,
  type LoggerInitialGroup,
} from "@/components/WorkoutLogger";
import type { WorkoutSet } from "@/lib/types";

export default async function WorkoutPage({
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
    .select("id, day_name, notes, performed_at, day_id")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("session_id", id)
    .order("exercise_id")
    .order("set_number");

  const setRows = (sets ?? []) as WorkoutSet[];

  // Oefening-meta (naam + foto).
  const exerciseIds = [...new Set(setRows.map((s) => s.exercise_id))];
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, image_urls")
    .in("id", exerciseIds.length ? exerciseIds : ["__none__"]);
  const metaById = new Map(
    (exercises ?? []).map((e) => [
      e.id,
      { name: e.name as string, image: (e.image_urls?.[0] as string) ?? null },
    ]),
  );

  // "Vorige keer": sets uit de meest recente eerdere sessie per oefening.
  const previousByExercise: Record<string, { weight: number | null; reps: number | null }[]> = {};
  if (exerciseIds.length) {
    const { data: prev } = await supabase
      .from("workout_sets")
      .select("exercise_id, set_number, weight, reps, session:workout_sessions!inner(id, performed_at)")
      .in("exercise_id", exerciseIds)
      .neq("session_id", id)
      .order("set_number");
    type PrevRow = {
      exercise_id: string;
      set_number: number;
      weight: number | null;
      reps: number | null;
      session: { id: string; performed_at: string } | null;
    };
    const latestSessionByEx: Record<string, string> = {};
    const latestTimeByEx: Record<string, string> = {};
    for (const r of (prev ?? []) as unknown as PrevRow[]) {
      if (!r.session) continue;
      const t = r.session.performed_at;
      if (!latestTimeByEx[r.exercise_id] || t > latestTimeByEx[r.exercise_id]) {
        latestTimeByEx[r.exercise_id] = t;
        latestSessionByEx[r.exercise_id] = r.session.id;
      }
    }
    for (const r of (prev ?? []) as unknown as PrevRow[]) {
      if (!r.session) continue;
      if (r.session.id !== latestSessionByEx[r.exercise_id]) continue;
      (previousByExercise[r.exercise_id] ??= []).push({
        weight: r.weight,
        reps: r.reps,
      });
    }
  }

  // Rusttijd per oefening uit het schema (de dag van deze sessie).
  const restByExercise: Record<string, number> = {};
  if (session.day_id) {
    const { data: planned } = await supabase
      .from("routine_exercises")
      .select("exercise_id, rest")
      .eq("day_id", session.day_id);
    for (const p of (planned ?? []) as { exercise_id: string; rest: string | null }[]) {
      const secs = parseRestToSeconds(p.rest);
      if (secs) restByExercise[p.exercise_id] = secs;
    }
  }

  // Groepeer sets per oefening (volgorde van eerste voorkomen).
  const groups: LoggerInitialGroup[] = [];
  const indexByExercise = new Map<string, number>();
  for (const s of setRows) {
    let gi = indexByExercise.get(s.exercise_id);
    if (gi === undefined) {
      gi = groups.length;
      indexByExercise.set(s.exercise_id, gi);
      const meta = metaById.get(s.exercise_id);
      groups.push({
        exerciseId: s.exercise_id,
        name: meta?.name ?? s.exercise_name ?? "Oefening",
        image: meta?.image ?? null,
        restSeconds: restByExercise[s.exercise_id] ?? null,
        previous: previousByExercise[s.exercise_id] ?? [],
        sets: [],
      });
    }
    groups[gi].sets.push({
      reps: s.reps,
      weight: s.weight,
      oneRm: s.one_rep_max,
      rir: s.rir,
      setType: s.set_type,
      completed: s.completed,
    });
  }

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-3xl font-bold">{t("wk.title")}</h1>
        <p className="mb-6 text-muted">{t("wk.subtitle")}</p>
        <WorkoutLogger
          sessionId={session.id}
          dayName={session.day_name ?? "Workout"}
          startedAt={session.performed_at}
          initialGroups={groups}
          initialNotes={session.notes ?? ""}
        />
      </main>
    </>
  );
}
