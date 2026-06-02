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

function toNum(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(",", ".").trim();
  if (s === "") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export async function addBodyMetric(formData: FormData) {
  const { supabase, user } = await requireUser();
  const measuredAt =
    String(formData.get("measured_at") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  const row = {
    user_id: user.id,
    measured_at: measuredAt,
    weight: toNum(formData.get("weight")),
    body_fat: toNum(formData.get("body_fat")),
    chest: toNum(formData.get("chest")),
    waist: toNum(formData.get("waist")),
    arms: toNum(formData.get("arms")),
    thighs: toNum(formData.get("thighs")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  await supabase.from("body_metrics").insert(row);
  revalidatePath("/body");
}

export async function deleteBodyMetric(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("body_metrics").delete().eq("id", id);
  revalidatePath("/body");
}
