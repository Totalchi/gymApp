"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendPush, type PushSub } from "@/lib/push";
import { isUuid } from "@/lib/text";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function sendMessage(formData: FormData) {
  const { supabase, user } = await requireUser();
  const otherId = String(formData.get("other_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!otherId || !isUuid(otherId) || !body) return;

  // Actieve coach-relatie bepalen (welke richting?).
  const { data: rel } = await supabase
    .from("coach_clients")
    .select("coach_id, client_id")
    .eq("status", "active")
    .or(
      `and(coach_id.eq.${user.id},client_id.eq.${otherId}),and(coach_id.eq.${otherId},client_id.eq.${user.id})`,
    )
    .maybeSingle();
  if (!rel) return;

  await supabase.from("coach_messages").insert({
    coach_id: rel.coach_id,
    client_id: rel.client_id,
    sender_id: user.id,
    body: body.slice(0, 1000),
  });

  // Notificatie + push naar de gesprekspartner.
  const { data: me } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const myName =
    me?.display_name || (me?.username ? `@${me.username}` : "Iemand");
  const preview = body.slice(0, 60);

  await supabase.from("notifications").insert({
    user_id: otherId,
    actor_id: user.id,
    type: "coach_message",
    data: { actor: myName, actorId: user.id, preview },
  });

  const { data: subs } = await supabase.rpc("pair_push_subs", {
    p_other_id: otherId,
  });
  await sendPush((subs ?? []) as PushSub[], {
    title: myName,
    body: preview,
    url: `/messages/${user.id}`,
  });

  revalidatePath(`/messages/${otherId}`);
}
