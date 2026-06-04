"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const YEAR = 60 * 60 * 24 * 365;

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const weightUnit =
    String(formData.get("weight_unit") ?? "kg") === "lb" ? "lb" : "kg";

  await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName, weight_unit: weightUnit, bio });

  // Gebruikersnaam apart (uniek): fouten negeren zodat de rest wel opslaat.
  const usernameRaw = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "");
  if (formData.has("username")) {
    await supabase
      .from("profiles")
      .update({ username: usernameRaw || null })
      .eq("id", user.id);
  }

  // Cookie zodat de layout het snel kan lezen (zonder DB).
  const store = await cookies();
  store.set("unit", weightUnit, { path: "/", maxAge: YEAR });

  revalidatePath("/", "layout");
}

export async function setLanguage(formData: FormData) {
  const lang = String(formData.get("lang") ?? "nl") === "en" ? "en" : "nl";
  const store = await cookies();
  store.set("lang", lang, { path: "/", maxAge: YEAR });
  revalidatePath("/", "layout");
}
