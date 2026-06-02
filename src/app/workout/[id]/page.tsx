import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
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
    .select("id, day_name, notes")
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

  // Oefening-meta (naam + foto) ophalen voor de gebruikte oefeningen.
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

  // Groepeer sets per oefening (volgorde van eerste voorkomen behouden).
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
        sets: [],
      });
    }
    groups[gi].sets.push({
      reps: s.reps,
      weight: s.weight,
      oneRm: s.one_rep_max,
    });
  }

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-3xl font-bold">Workout loggen</h1>
        <p className="mb-6 text-slate-400">
          Vul je echte sets, reps en kg in. RIR wordt automatisch berekend.
        </p>
        <WorkoutLogger
          sessionId={session.id}
          dayName={session.day_name ?? "Workout"}
          initialGroups={groups}
          initialNotes={session.notes ?? ""}
        />
      </main>
    </>
  );
}
