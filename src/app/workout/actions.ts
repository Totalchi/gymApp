"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeRir } from "@/lib/rir";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Start een workout vanuit een dag: maakt een sessie aan en vult alvast de
 * geplande sets in (vanuit het schema). Daarna kun je de echte waarden loggen.
 */
export async function startWorkout(formData: FormData) {
  const { supabase, user } = await requireUser();
  const routineId = String(formData.get("routine_id"));
  const dayId = String(formData.get("day_id"));
  const dayName = String(formData.get("day_name") ?? "Workout");

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      routine_id: routineId,
      day_id: dayId,
      day_name: dayName,
    })
    .select("id")
    .single();

  if (error || !session) throw new Error(error?.message ?? "Sessie mislukt");

  // Geplande oefeningen ophalen en omzetten naar gelogde sets.
  const { data: planned } = await supabase
    .from("routine_exercises")
    .select("exercise_id, sets, reps, weight, one_rep_max, rir, position, exercise:exercises(name)")
    .eq("day_id", dayId)
    .order("position");

  const rows: Array<Record<string, unknown>> = [];
  for (const pe of planned ?? []) {
    const exercise = pe.exercise as unknown as { name?: string } | null;
    const setCount = Math.max(1, pe.sets ?? 1);
    for (let i = 1; i <= setCount; i++) {
      const rir =
        pe.rir != null
          ? pe.rir
          : pe.weight && pe.reps && pe.one_rep_max
            ? (computeRir({
                weight: pe.weight,
                reps: pe.reps,
                oneRepMax: pe.one_rep_max,
              })?.rir ?? null)
            : null;
      rows.push({
        session_id: session.id,
        exercise_id: pe.exercise_id,
        exercise_name: exercise?.name ?? null,
        set_number: i,
        reps: pe.reps,
        weight: pe.weight,
        one_rep_max: pe.one_rep_max,
        rir,
        set_type: "normal",
        completed: false,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("workout_sets").insert(rows);
  }

  redirect(`/workout/${session.id}`);
}

interface SetInput {
  exercise_id: string;
  exercise_name: string | null;
  set_number: number;
  reps: number | null;
  weight: number | null;
  one_rep_max: number | null;
  rir?: number | null;
  set_type?: string;
  completed?: boolean;
}

/**
 * Sla de gelogde sets op. We vervangen de bestaande sets door de doorgegeven
 * lijst en herberekenen RIR server-side.
 */
export async function saveWorkout(
  sessionId: string,
  sets: SetInput[],
  notes: string,
  durationSeconds?: number,
) {
  const { supabase, user } = await requireUser();

  // Eigendom controleren.
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, user_id, routine_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.user_id !== user.id) {
    throw new Error("Geen toegang tot deze sessie.");
  }

  await supabase.from("workout_sets").delete().eq("session_id", sessionId);

  const rows = sets.map((s) => {
    // Handmatige RIR heeft voorrang; anders automatisch berekenen.
    const rir =
      s.rir != null
        ? s.rir
        : s.weight && s.reps && s.one_rep_max
          ? (computeRir({
              weight: s.weight,
              reps: s.reps,
              oneRepMax: s.one_rep_max,
            })?.rir ?? null)
          : null;
    return {
      session_id: sessionId,
      exercise_id: s.exercise_id,
      exercise_name: s.exercise_name,
      set_number: s.set_number,
      reps: s.reps,
      weight: s.weight,
      one_rep_max: s.one_rep_max,
      rir,
      set_type: s.set_type ?? "normal",
      completed: s.completed ?? true,
    };
  });

  if (rows.length > 0) {
    await supabase.from("workout_sets").insert(rows);
  }

  await supabase
    .from("workout_sessions")
    .update({
      notes: notes.trim() || null,
      duration_seconds: durationSeconds ?? null,
    })
    .eq("id", sessionId);

  revalidatePath("/history");
  revalidatePath("/progress");
  redirect(`/workout/${sessionId}/done`);
}

export async function deleteSession(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("workout_sessions").delete().eq("id", id);
  revalidatePath("/history");
}
