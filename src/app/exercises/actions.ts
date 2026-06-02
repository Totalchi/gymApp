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

export interface CustomExerciseState {
  error?: string;
  createdId?: string;
}

/**
 * Maak een eigen oefening aan. De foto wordt (optioneel) geüpload naar de
 * `exercise-images` bucket onder een map met de user-id (zodat RLS klopt).
 */
export async function createCustomExercise(
  _prev: CustomExerciseState,
  formData: FormData,
): Promise<CustomExerciseState> {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Geef de oefening een naam." };

  const primaryMuscle = String(formData.get("primary_muscle") ?? "").trim();
  const equipment = String(formData.get("equipment") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const imageUrls: string[] = [];
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: "De foto mag maximaal 5 MB zijn." };
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("exercise-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      return { error: `Upload mislukt: ${uploadError.message}` };
    }
    const { data } = supabase.storage
      .from("exercise-images")
      .getPublicUrl(path);
    imageUrls.push(data.publicUrl);
  }

  const id = `custom_${crypto.randomUUID()}`;
  const { error } = await supabase.from("exercises").insert({
    id,
    name,
    owner_id: user.id,
    category: "strength",
    primary_muscles: primaryMuscle ? [primaryMuscle] : [],
    secondary_muscles: [],
    equipment,
    instructions,
    image_urls: imageUrls,
  });

  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/exercises");
  return { createdId: id };
}

export async function deleteCustomExercise(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  // Alleen eigen oefeningen; RLS dwingt dit ook af.
  await supabase
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidatePath("/exercises");
}
