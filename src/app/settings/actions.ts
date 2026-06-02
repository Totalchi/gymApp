"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim() || null;
  const weightUnit = String(formData.get("weight_unit") ?? "kg") === "lb" ? "lb" : "kg";

  // Upsert zodat het ook werkt als er nog geen profielrij is.
  await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName, weight_unit: weightUnit });

  revalidatePath("/", "layout");
}
