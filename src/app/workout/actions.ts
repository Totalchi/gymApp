"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeRir, epleyOneRepMax } from "@/lib/rir";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Herhaal een eerdere workout: maak een nieuwe sessie met dezelfde oefeningen
 * en sets (als doel; nog niet afgevinkt).
 */
export async function repeatWorkout(formData: FormData) {
  const { supabase, user } = await requireUser();
  const sourceId = String(formData.get("id"));

  const { data: src } = await supabase
    .from("workout_sessions")
    .select("routine_id, day_id, day_name")
    .eq("id", sourceId)
    .single();
  if (!src) return;

  const { data: srcSets } = await supabase
    .from("workout_sets")
    .select("exercise_id, exercise_name, set_number, reps, weight, one_rep_max, rir, set_type, unilateral")
    .eq("session_id", sourceId)
    .order("set_number");

  const { data: session } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      routine_id: src.routine_id,
      day_id: src.day_id,
      day_name: src.day_name,
    })
    .select("id")
    .single();
  if (!session) return;

  const rows = (srcSets ?? []).map((s) => ({
    session_id: session.id,
    exercise_id: s.exercise_id,
    exercise_name: s.exercise_name,
    set_number: s.set_number,
    reps: s.reps,
    weight: s.weight,
    one_rep_max: s.one_rep_max,
    rir: s.rir,
    set_type: s.set_type ?? "normal",
    completed: false,
    unilateral: (s as { unilateral?: boolean }).unilateral ?? false,
  }));
  if (rows.length) await supabase.from("workout_sets").insert(rows);

  redirect(`/workout/${session.id}`);
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
    .select("exercise_id, sets, reps, weight, one_rep_max, rir, position, unilateral, exercise:exercises(name)")
    .eq("day_id", dayId)
    .order("position");

  // Wat deed je VORIGE keer per oefening? Die waarden vullen we vast in zodat
  // je meteen weet waar te starten (jouw eigen meest recente sessie per oefening).
  const exerciseIds = [...new Set((planned ?? []).map((p) => p.exercise_id))];
  const prevByExSet: Record<
    string,
    Record<number, { weight: number | null; reps: number | null; one_rep_max: number | null }>
  > = {};
  if (exerciseIds.length) {
    const { data: prev } = await supabase
      .from("workout_sets")
      .select(
        "exercise_id, set_number, weight, reps, one_rep_max, session:workout_sessions!inner(user_id, performed_at)",
      )
      .in("exercise_id", exerciseIds)
      .order("set_number");
    type PrevRow = {
      exercise_id: string;
      set_number: number;
      weight: number | null;
      reps: number | null;
      one_rep_max: number | null;
      session: { user_id: string; performed_at: string } | null;
    };
    const latestTime: Record<string, string> = {};
    for (const r of (prev ?? []) as unknown as PrevRow[]) {
      if (!r.session || r.session.user_id !== user.id) continue;
      const t = r.session.performed_at;
      if (!latestTime[r.exercise_id] || t > latestTime[r.exercise_id]) {
        latestTime[r.exercise_id] = t;
      }
    }
    for (const r of (prev ?? []) as unknown as PrevRow[]) {
      if (!r.session || r.session.user_id !== user.id) continue;
      if (r.session.performed_at !== latestTime[r.exercise_id]) continue;
      (prevByExSet[r.exercise_id] ??= {})[r.set_number] = {
        weight: r.weight,
        reps: r.reps,
        one_rep_max: r.one_rep_max,
      };
    }
  }

  const rows: Array<Record<string, unknown>> = [];
  for (const pe of planned ?? []) {
    const exercise = pe.exercise as unknown as { name?: string } | null;
    const setCount = Math.max(1, pe.sets ?? 1);
    for (let i = 1; i <= setCount; i++) {
      // Vorige keer heeft voorrang; anders de geplande waarde uit het schema.
      const prevSet = prevByExSet[pe.exercise_id]?.[i];
      const weight = prevSet?.weight ?? pe.weight ?? null;
      const reps = prevSet?.reps ?? pe.reps ?? null;
      const oneRm = prevSet?.one_rep_max ?? pe.one_rep_max ?? null;
      const rir =
        pe.rir != null
          ? pe.rir
          : weight && reps && oneRm
            ? (computeRir({
                weight,
                reps,
                oneRepMax: oneRm,
              })?.rir ?? null)
            : null;
      rows.push({
        session_id: session.id,
        exercise_id: pe.exercise_id,
        exercise_name: exercise?.name ?? null,
        set_number: i,
        reps,
        weight,
        one_rep_max: oneRm,
        rir,
        set_type: "normal",
        completed: false,
        unilateral: (pe as { unilateral?: boolean }).unilateral ?? false,
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
  unilateral?: boolean;
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
      unilateral: s.unilateral ?? false,
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

  // PR-detectie: een nieuw geschat 1RM-record op een oefening → 🏆 melding.
  try {
    const e1 = (w: number | null, r: number | null) =>
      w && r && w > 0 && r > 0 ? epleyOneRepMax(w, r) : 0;
    const sessionBest: Record<string, number> = {};
    const nameById: Record<string, string | null> = {};
    for (const s of sets) {
      if (s.set_type === "warmup") continue;
      const e = e1(s.weight, s.reps);
      if (e > (sessionBest[s.exercise_id] ?? 0)) sessionBest[s.exercise_id] = e;
      nameById[s.exercise_id] = s.exercise_name;
    }
    const exIds = Object.keys(sessionBest);
    if (exIds.length) {
      const { data: prevSets } = await supabase
        .from("workout_sets")
        .select("exercise_id, weight, reps, set_type, session:workout_sessions!inner(user_id)")
        .in("exercise_id", exIds)
        .neq("session_id", sessionId);
      type PR = {
        exercise_id: string;
        weight: number | null;
        reps: number | null;
        set_type: string | null;
        session: { user_id: string } | null;
      };
      const prevBest: Record<string, number> = {};
      for (const r of (prevSets ?? []) as unknown as PR[]) {
        if (!r.session || r.session.user_id !== user.id) continue;
        if (r.set_type === "warmup") continue;
        const e = e1(r.weight, r.reps);
        if (e > (prevBest[r.exercise_id] ?? 0)) prevBest[r.exercise_id] = e;
      }
      const prNotifs = exIds
        .filter((id) => sessionBest[id] > 0 && (prevBest[id] ?? 0) > 0 && sessionBest[id] > prevBest[id] + 0.01)
        .map((id) => ({
          user_id: user.id,
          actor_id: user.id,
          type: "pr",
          data: {
            exercise: nameById[id] ?? "oefening",
            e1rm: String(Math.round(sessionBest[id])),
            exerciseId: id,
          },
        }));
      if (prNotifs.length) await supabase.from("notifications").insert(prNotifs);
    }
  } catch {}

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
