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

export async function addGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const kind = String(formData.get("kind") ?? "") === "lift" ? "lift" : "bodyweight";
  const target = parseFloat(String(formData.get("target") ?? "").replace(",", "."));
  if (!Number.isFinite(target) || target <= 0) return;
  const exerciseId =
    kind === "lift" ? String(formData.get("exercise_id") ?? "").trim() || null : null;
  if (kind === "lift" && !exerciseId) return;

  await supabase.from("goals").insert({
    user_id: user.id,
    kind,
    exercise_id: exerciseId,
    target,
  });
  revalidatePath("/goals");
}

export async function deleteGoal(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("goals").delete().eq("id", id);
  revalidatePath("/goals");
}
