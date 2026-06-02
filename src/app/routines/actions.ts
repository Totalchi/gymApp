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

// ---------------------------------------------------------------------------
// Routines (schema's)
// ---------------------------------------------------------------------------
export async function createRoutine(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const description = String(formData.get("description") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("routines")
    .insert({ user_id: user.id, name, description })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  redirect(`/routines/${data.id}`);
}

export async function deleteRoutine(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("routines").delete().eq("id", id);
  revalidatePath("/dashboard");
}

export async function duplicateRoutine(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));

  const { data: src } = await supabase
    .from("routines")
    .select("name, description, folder_id, routine_days(name, day_type, day_order, routine_exercises(exercise_id, position, sets, reps, weight, one_rep_max, rir, notes, rest_seconds, superset_group))")
    .eq("id", id)
    .single();
  if (!src) return;

  const { data: newRoutine } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name: `${src.name} (kopie)`,
      description: src.description,
      folder_id: src.folder_id,
    })
    .select("id")
    .single();
  if (!newRoutine) return;

  type Day = {
    name: string;
    day_type: string;
    day_order: number;
    routine_exercises: Record<string, unknown>[];
  };
  for (const day of (src.routine_days ?? []) as unknown as Day[]) {
    const { data: newDay } = await supabase
      .from("routine_days")
      .insert({
        routine_id: newRoutine.id,
        name: day.name,
        day_type: day.day_type,
        day_order: day.day_order,
      })
      .select("id")
      .single();
    if (!newDay) continue;
    const exRows = (day.routine_exercises ?? []).map((e) => ({
      ...e,
      day_id: newDay.id,
    }));
    if (exRows.length) await supabase.from("routine_exercises").insert(exRows);
  }

  revalidatePath("/dashboard");
  redirect(`/routines/${newRoutine.id}`);
}

// ---------------------------------------------------------------------------
// Mappen
// ---------------------------------------------------------------------------
export async function createFolder(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("routine_folders").insert({ user_id: user.id, name });
  revalidatePath("/dashboard");
}

export async function deleteFolder(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("routine_folders").delete().eq("id", id);
  revalidatePath("/dashboard");
}

export async function setRoutineFolder(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("routine_id"));
  const folderId = String(formData.get("folder_id") || "");
  await supabase
    .from("routines")
    .update({ folder_id: folderId || null })
    .eq("id", id);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Supersets
// ---------------------------------------------------------------------------
export async function toggleSuperset(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const dayId = String(formData.get("day_id"));
  const routineId = String(formData.get("routine_id"));

  const { data: rows } = await supabase
    .from("routine_exercises")
    .select("id, position, superset_group")
    .eq("day_id", dayId)
    .order("position");
  if (!rows) return;

  const idx = rows.findIndex((r) => r.id === id);
  if (idx <= 0) return; // eerste oefening kan niet met "vorige" gekoppeld worden

  const me = rows[idx];
  if (me.superset_group != null) {
    // Loskoppelen.
    await supabase
      .from("routine_exercises")
      .update({ superset_group: null })
      .eq("id", id);
  } else {
    const prev = rows[idx - 1];
    let group = prev.superset_group;
    if (group == null) {
      // Nieuw groepsnummer = hoogste bestaande + 1.
      const max = Math.max(0, ...rows.map((r) => r.superset_group ?? 0));
      group = max + 1;
      await supabase
        .from("routine_exercises")
        .update({ superset_group: group })
        .eq("id", prev.id);
    }
    await supabase
      .from("routine_exercises")
      .update({ superset_group: group })
      .eq("id", id);
  }

  revalidatePath(`/routines/${routineId}`);
}

// ---------------------------------------------------------------------------
// Dagen
// ---------------------------------------------------------------------------
export async function addDay(formData: FormData) {
  const { supabase } = await requireUser();
  const routineId = String(formData.get("routine_id"));
  const dayType = String(formData.get("day_type") ?? "custom");
  const name = String(formData.get("name") ?? "").trim() || "Nieuwe dag";

  const { count } = await supabase
    .from("routine_days")
    .select("id", { count: "exact", head: true })
    .eq("routine_id", routineId);

  await supabase.from("routine_days").insert({
    routine_id: routineId,
    name,
    day_type: dayType,
    day_order: count ?? 0,
  });

  revalidatePath(`/routines/${routineId}`);
}

export async function deleteDay(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const routineId = String(formData.get("routine_id"));
  await supabase.from("routine_days").delete().eq("id", id);
  revalidatePath(`/routines/${routineId}`);
}

// ---------------------------------------------------------------------------
// Oefeningen binnen een dag
// ---------------------------------------------------------------------------
export async function addExerciseToDay(formData: FormData) {
  const { supabase } = await requireUser();
  const dayId = String(formData.get("day_id"));
  const exerciseId = String(formData.get("exercise_id"));
  const routineId = String(formData.get("routine_id"));

  const { count } = await supabase
    .from("routine_exercises")
    .select("id", { count: "exact", head: true })
    .eq("day_id", dayId);

  await supabase.from("routine_exercises").insert({
    day_id: dayId,
    exercise_id: exerciseId,
    position: count ?? 0,
    sets: 3,
    reps: 10,
  });

  revalidatePath(`/routines/${routineId}`);
}

export async function updateRoutineExercise(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const routineId = String(formData.get("routine_id"));

  const sets = toInt(formData.get("sets"));
  const reps = toInt(formData.get("reps"));
  const weight = toNum(formData.get("weight"));
  const oneRepMax = toNum(formData.get("one_rep_max"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // RIR server-side opnieuw berekenen zodat de opgeslagen waarde klopt.
  let rir: number | null = null;
  if (weight && reps && oneRepMax) {
    rir = computeRir({ weight, reps, oneRepMax })?.rir ?? null;
  }

  await supabase
    .from("routine_exercises")
    .update({
      sets: sets ?? 3,
      reps: reps ?? 10,
      weight,
      one_rep_max: oneRepMax,
      rir,
      notes,
    })
    .eq("id", id);

  revalidatePath(`/routines/${routineId}`);
}

export async function deleteRoutineExercise(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const routineId = String(formData.get("routine_id"));
  await supabase.from("routine_exercises").delete().eq("id", id);
  revalidatePath(`/routines/${routineId}`);
}

// ---------------------------------------------------------------------------
// Herordenen (drag & drop)
// ---------------------------------------------------------------------------
export async function reorderDays(routineId: string, orderedIds: string[]) {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("routine_days")
        .update({ day_order: index })
        .eq("id", id)
        .eq("routine_id", routineId),
    ),
  );
  revalidatePath(`/routines/${routineId}`);
}

export async function reorderExercises(
  routineId: string,
  dayId: string,
  orderedIds: string[],
) {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("routine_exercises")
        .update({ position: index })
        .eq("id", id)
        .eq("day_id", dayId),
    ),
  );
  revalidatePath(`/routines/${routineId}`);
}

function toInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}
function toNum(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(",", ".").trim();
  if (s === "") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
