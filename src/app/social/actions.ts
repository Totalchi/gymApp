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

/** Stuur een notificatie i.v.m. een volg-actie. */
async function notifyFollow(
  supabase: DB,
  actorId: string,
  recipientId: string,
  type: "follow_request" | "follow_accepted",
) {
  const { data: actor } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", actorId)
    .maybeSingle();
  const name =
    actor?.display_name || (actor?.username ? `@${actor.username}` : "Iemand");
  await supabase.from("notifications").insert({
    user_id: recipientId,
    actor_id: actorId,
    type,
    data: { actor: name, actorId },
  });
}

/**
 * Volgen is nu een verzoek: maakt een 'pending' volgrelatie + notificatie.
 * Bestaat er al een relatie (pending of accepted), dan wordt die verwijderd
 * (verzoek annuleren / ontvolgen).
 */
export async function toggleFollow(formData: FormData) {
  const { supabase, user } = await requireUser();
  const target = String(formData.get("target_id"));
  if (!target || target === user.id) return;

  const { data: existing } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("following_id", target)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", target);
    // Eventueel openstaand verzoek-notificatie opruimen.
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", target)
      .eq("actor_id", user.id)
      .eq("type", "follow_request");
  } else {
    await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: target, status: "pending" });
    await notifyFollow(supabase, user.id, target, "follow_request");
  }
  revalidatePath(`/u/${target}`);
  revalidatePath("/people");
  revalidatePath("/feed");
}

/** Ontvanger accepteert een volgverzoek. */
export async function acceptFollow(formData: FormData) {
  const { supabase, user } = await requireUser();
  const follower = String(formData.get("follower_id"));
  if (!follower) return;
  await supabase
    .from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", follower)
    .eq("following_id", user.id);
  await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("actor_id", follower)
    .eq("type", "follow_request");
  await notifyFollow(supabase, user.id, follower, "follow_accepted");
  revalidatePath("/notifications");
  revalidatePath(`/u/${user.id}`);
  revalidatePath("/feed");
}

/** Ontvanger weigert een volgverzoek. */
export async function declineFollow(formData: FormData) {
  const { supabase, user } = await requireUser();
  const follower = String(formData.get("follower_id"));
  if (!follower) return;
  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", follower)
    .eq("following_id", user.id)
    .eq("status", "pending");
  await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("actor_id", follower)
    .eq("type", "follow_request");
  revalidatePath("/notifications");
}

export async function toggleLike(formData: FormData) {
  const { supabase, user } = await requireUser();
  const sessionId = String(formData.get("session_id"));

  const { data: existing } = await supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("session_id", sessionId);
  } else {
    await supabase.from("likes").insert({ user_id: user.id, session_id: sessionId });
  }
  revalidatePath("/feed");
  revalidatePath(`/w/${sessionId}`);
}

export async function addComment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const sessionId = String(formData.get("session_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await supabase
    .from("comments")
    .insert({ session_id: sessionId, user_id: user.id, body: body.slice(0, 500) });
  revalidatePath(`/w/${sessionId}`);
  revalidatePath("/feed");
}

export async function deleteComment(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const sessionId = String(formData.get("session_id"));
  await supabase.from("comments").delete().eq("id", id);
  revalidatePath(`/w/${sessionId}`);
}

export async function toggleShared(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  const { data: s } = await supabase
    .from("workout_sessions")
    .select("shared, user_id")
    .eq("id", id)
    .single();
  if (!s || s.user_id !== user.id) return;
  await supabase
    .from("workout_sessions")
    .update({ shared: !s.shared })
    .eq("id", id);
  revalidatePath("/history");
}
