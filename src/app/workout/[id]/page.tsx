import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { parseRestToSeconds } from "@/lib/rest";
import { suggestProgression } from "@/lib/progression";
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
  // Werksets (zonder warmup) van de vorige keer — voor de progressie-suggestie.
  const prevWorkingByExercise: Record<
    string,
    { weight: number | null; reps: number | null }[]
  > = {};
  if (exerciseIds.length) {
    const { data: prev } = await supabase
      .from("workout_sets")
      .select("exercise_id, set_number, weight, reps, rir, set_type, session:workout_sessions!inner(id, performed_at)")
      .in("exercise_id", exerciseIds)
      .neq("session_id", id)
      .order("set_number");
    type PrevRow = {
      exercise_id: string;
      set_number: number;
      weight: number | null;
      reps: number | null;
      rir: number | null;
      set_type: string | null;
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
      if (r.set_type !== "warmup") {
        (prevWorkingByExercise[r.exercise_id] ??= []).push({
          weight: r.weight,
          reps: r.reps,
        });
      }
    }
  }

  // Schema-doelen per oefening (rusttijd + rep-bereik + doel-RIR).
  const restByExercise: Record<string, number> = {};
  const targetByExercise: Record<
    string,
    { repLow: number | null; repHigh: number | null }
  > = {};
  if (session.day_id) {
    const { data: planned } = await supabase
      .from("routine_exercises")
      .select("exercise_id, rest, reps, reps_max")
      .eq("day_id", session.day_id);
    for (const p of (planned ?? []) as {
      exercise_id: string;
      rest: string | null;
      reps: number | null;
      reps_max: number | null;
    }[]) {
      const secs = parseRestToSeconds(p.rest);
      if (secs) restByExercise[p.exercise_id] = secs;
      targetByExercise[p.exercise_id] = { repLow: p.reps, repHigh: p.reps_max };
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
      const target = targetByExercise[s.exercise_id];
      const suggestion = target
        ? suggestProgression(prevWorkingByExercise[s.exercise_id] ?? [], target)
        : null;
      groups.push({
        exerciseId: s.exercise_id,
        name: meta?.name ?? s.exercise_name ?? "Oefening",
        image: meta?.image ?? null,
        restSeconds: restByExercise[s.exercise_id] ?? null,
        previous: previousByExercise[s.exercise_id] ?? [],
        suggestion: suggestion && suggestion.kind === "up" ? suggestion : null,
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
    <div className="fixed inset-0 z-10 flex flex-col bg-canvas">
      <Header email={user?.email} />
      <WorkoutLogger
        sessionId={session.id}
        dayName={session.day_name ?? "Workout"}
        initialGroups={groups}
        initialNotes={session.notes ?? ""}
      />
    </div>
  );
}
