"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type DB = Awaited<ReturnType<typeof createClient>>;

async function exerciseName(supabase: DB, id?: string | null): Promise<string | undefined> {
  if (!id) return undefined;
  const { data } = await supabase.from("exercises").select("name").eq("id", id).maybeSingle();
  return data?.name ?? undefined;
}

/**
 * Stuur de cliënt een notificatie wanneer zijn coach een TOEGEWEZEN schema
 * aanpast. Doet niets als de bewerker de eigenaar is of het schema niet door
 * hem werd toegewezen.
 */
async function notifyAssignedRoutineChange(
  supabase: DB,
  actorId: string,
  routineId: string,
  type: "coach_swap" | "coach_add" | "coach_remove",
  extra: { from?: string; to?: string },
) {
  const { data: r } = await supabase
    .from("routines")
    .select("user_id, assigned_by, name")
    .eq("id", routineId)
    .maybeSingle();
  if (!r || r.assigned_by !== actorId || r.user_id === actorId) return;

  const { data: coach } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", actorId)
    .maybeSingle();
  const coachName =
    coach?.display_name || (coach?.username ? `@${coach.username}` : "Coach");

  await supabase.from("notifications").insert({
    user_id: r.user_id,
    actor_id: actorId,
    type,
    data: { ...extra, coach: coachName, routine: r.name, routineId },
  });
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
    .select("name, description, folder_id, routine_days(name, day_type, day_order, routine_exercises(exercise_id, position, sets, reps, reps_max, weight, one_rep_max, rir, rir_max, notes, rest, rest_seconds, superset_group))")
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

export async function addTemplate(formData: FormData) {
  const { supabase, user } = await requireUser();
  const templateId = String(formData.get("template_id"));
  const { ROUTINE_TEMPLATES } = await import("@/lib/templates");
  const tpl = ROUTINE_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return;

  const { data: routine } = await supabase
    .from("routines")
    .insert({ user_id: user.id, name: tpl.name, description: tpl.description })
    .select("id")
    .single();
  if (!routine) return;

  for (let d = 0; d < tpl.days.length; d++) {
    const day = tpl.days[d];
    const { data: newDay } = await supabase
      .from("routine_days")
      .insert({
        routine_id: routine.id,
        name: day.name,
        day_type: day.dayType,
        day_order: d,
      })
      .select("id")
      .single();
    if (!newDay) continue;
    const rows = day.exercises.map((ex, i) => ({
      day_id: newDay.id,
      exercise_id: ex.exerciseId,
      position: i,
      sets: ex.sets,
      reps: ex.reps,
    }));
    if (rows.length) await supabase.from("routine_exercises").insert(rows);
  }

  revalidatePath("/dashboard");
  redirect(`/routines/${routine.id}`);
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

export async function setDayWeekday(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const routineId = String(formData.get("routine_id"));
  const raw = String(formData.get("weekday") ?? "");
  const weekday = raw === "" ? null : parseInt(raw, 10);
  await supabase
    .from("routine_days")
    .update({ weekday: weekday != null && weekday >= 0 && weekday <= 6 ? weekday : null })
    .eq("id", id);
  revalidatePath(`/routines/${routineId}`);
  revalidatePath("/dashboard");
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
  const { supabase, user } = await requireUser();
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

  await notifyAssignedRoutineChange(supabase, user.id, routineId, "coach_add", {
    to: await exerciseName(supabase, exerciseId),
  });

  revalidatePath(`/routines/${routineId}`);
}

/** Vervang één oefening door een andere (behoudt sets/reps/positie). */
export async function swapRoutineExercise(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  const routineId = String(formData.get("routine_id"));
  const newExerciseId = String(formData.get("exercise_id"));
  if (!id || !newExerciseId) return;

  const { data: row } = await supabase
    .from("routine_exercises")
    .select("exercise_id")
    .eq("id", id)
    .maybeSingle();
  const oldExerciseId = row?.exercise_id as string | undefined;
  if (oldExerciseId === newExerciseId) return;

  await supabase
    .from("routine_exercises")
    .update({ exercise_id: newExerciseId })
    .eq("id", id);

  await notifyAssignedRoutineChange(supabase, user.id, routineId, "coach_swap", {
    from: await exerciseName(supabase, oldExerciseId),
    to: await exerciseName(supabase, newExerciseId),
  });

  revalidatePath(`/routines/${routineId}`);
}

export async function updateRoutineExercise(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const routineId = String(formData.get("routine_id"));

  const sets = toInt(formData.get("sets"));
  const weight = toNum(formData.get("weight"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const rest = String(formData.get("rest") ?? "").trim() || null;

  // Reps-bereik: aparte onder- en bovengrens. Bovengrens optioneel.
  const repsRaw = String(formData.get("reps") ?? "");
  const repsMaxRaw = String(formData.get("reps_max") ?? "");
  const repsNums = repsRaw.match(/\d+/g)?.map((n) => parseInt(n, 10)) ?? [];
  const reps = repsNums[0] ?? 10;
  const repsMaxField = toInt(formData.get("reps_max"));
  let repsMax =
    repsMaxRaw.trim() !== "" ? repsMaxField : repsNums.length > 1 ? repsNums[1] : null;
  if (repsMax != null && repsMax <= reps) repsMax = null; // geen bereik nodig

  // RIR: één veld dat ook een bereik aankan ("2-3").
  const rirRaw = String(formData.get("rir") ?? "");
  const rirNums =
    rirRaw.match(/\d+(?:[.,]\d+)?/g)?.map((n) => parseFloat(n.replace(",", "."))) ?? [];
  const rir = rirNums[0] ?? null;
  let rirMax = rirNums.length > 1 ? rirNums[1] : null;
  if (rir != null && rirMax != null && rirMax <= rir) rirMax = null;

  await supabase
    .from("routine_exercises")
    .update({
      sets: sets ?? 3,
      reps,
      reps_max: repsMax,
      weight,
      rir,
      rir_max: rirMax,
      notes,
      rest,
    })
    .eq("id", id);

  revalidatePath(`/routines/${routineId}`);
}

export async function deleteRoutineExercise(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  const routineId = String(formData.get("routine_id"));

  const { data: row } = await supabase
    .from("routine_exercises")
    .select("exercise_id")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("routine_exercises").delete().eq("id", id);

  await notifyAssignedRoutineChange(supabase, user.id, routineId, "coach_remove", {
    from: await exerciseName(supabase, row?.exercise_id as string | undefined),
  });

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
