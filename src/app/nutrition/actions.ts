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

function toInt(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(",", ".").trim();
  if (s === "") return null;
  const n = Math.round(parseFloat(s));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function saveNutrition(formData: FormData) {
  const { supabase, user } = await requireUser();
  const date =
    String(formData.get("log_date") ?? "") ||
    new Date().toISOString().slice(0, 10);

  await supabase.from("nutrition_logs").upsert(
    {
      user_id: user.id,
      log_date: date,
      calories: toInt(formData.get("calories")),
      protein: toInt(formData.get("protein")),
      carbs: toInt(formData.get("carbs")),
      fat: toInt(formData.get("fat")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" },
  );
  revalidatePath("/nutrition");
}

export async function setNutritionGoals(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({
      calorie_goal: toInt(formData.get("calorie_goal")),
      protein_goal: toInt(formData.get("protein_goal")),
    })
    .eq("id", user.id);
  revalidatePath("/nutrition");
}
