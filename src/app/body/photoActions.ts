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

export async function uploadProgressPhoto(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 8 * 1024 * 1024) return;

  const takenOn =
    String(formData.get("taken_on") ?? "") || new Date().toISOString().slice(0, 10);
  const shared = formData.get("shared_with_coach") != null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("progress-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return;

  const { data } = supabase.storage.from("progress-photos").getPublicUrl(path);
  await supabase.from("progress_photos").insert({
    user_id: user.id,
    url: data.publicUrl,
    path,
    taken_on: takenOn,
    shared_with_coach: shared,
  });
  revalidatePath("/body");
}

export async function deleteProgressPhoto(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const path = String(formData.get("path"));
  if (path) await supabase.storage.from("progress-photos").remove([path]);
  await supabase.from("progress_photos").delete().eq("id", id);
  revalidatePath("/body");
}

export async function togglePhotoShared(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const shared = String(formData.get("shared")) === "true";
  await supabase.from("progress_photos").update({ shared_with_coach: shared }).eq("id", id);
  revalidatePath("/body");
}
