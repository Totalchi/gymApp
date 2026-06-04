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

/** Coach nodigt een cliënt uit (pending). */
export async function inviteClient(formData: FormData) {
  const { supabase, user } = await requireUser();
  const target = String(formData.get("target_id"));
  if (!target || target === user.id) return;
  await supabase
    .from("coach_clients")
    .upsert(
      { coach_id: user.id, client_id: target, status: "pending" },
      { onConflict: "coach_id,client_id", ignoreDuplicates: true },
    );
  revalidatePath("/coach");
}

/** Cliënt accepteert een coachverzoek. */
export async function acceptCoach(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  await supabase
    .from("coach_clients")
    .update({ status: "active" })
    .eq("id", id)
    .eq("client_id", user.id);
  revalidatePath("/coach");
}

/** Verwijder een relatie of verzoek (coach of cliënt). */
export async function removeRelation(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("coach_clients").delete().eq("id", id);
  revalidatePath("/coach");
}

/** Wijs een eigen schema toe aan een cliënt (kopie naar hun account). */
export async function assignRoutine(formData: FormData) {
  const { supabase } = await requireUser();
  const routineId = String(formData.get("routine_id"));
  const clientId = String(formData.get("client_id"));
  if (!routineId) return;
  await supabase.rpc("assign_routine", {
    p_routine_id: routineId,
    p_client_id: clientId,
  });
  revalidatePath(`/coach/${clientId}`);
}
