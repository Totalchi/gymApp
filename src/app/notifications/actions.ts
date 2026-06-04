"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth_secret: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth_secret: sub.auth_secret,
    },
    { onConflict: "endpoint" },
  );
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
