import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, type PushSub } from "@/lib/push";
import { renderNotification } from "@/lib/notifications";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Dagelijkse herinneringen (door Vercel Cron aangeroepen):
 *  - "Vandaag staat X op het programma" als je een trainingsdag op vandaag
 *    hebt gepland en nog niet trainde.
 *  - "Je trainde al N dagen niet" bij 3 of 7 dagen inactiviteit.
 * Enkel voor gebruikers met telefoonmeldingen aan én herinneringen niet uit.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY ontbreekt" },
      { status: 500 },
    );
  }

  const now = new Date();
  const appWeekday = (now.getUTCDay() + 6) % 7; // 0 = maandag
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  // Push-abonnementen per gebruiker.
  const { data: subsRows } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth_secret");
  const subsByUser = new Map<string, PushSub[]>();
  for (const s of subsRows ?? []) {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth_secret: s.auth_secret });
    subsByUser.set(s.user_id, arr);
  }
  if (subsByUser.size === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Voorkeuren + taal.
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, reminders_enabled, lang")
    .in("id", [...subsByUser.keys()]);
  const enabled = new Map<string, Lang>();
  for (const p of profs ?? []) {
    if (p.reminders_enabled !== false) {
      enabled.set(p.id, p.lang === "en" ? "en" : DEFAULT_LANG);
    }
  }
  if (enabled.size === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Wie trainde vandaag al?
  const { data: todaySessions } = await supabase
    .from("workout_sessions")
    .select("user_id")
    .gte("performed_at", todayStart)
    .in("user_id", [...enabled.keys()]);
  const trainedToday = new Set((todaySessions ?? []).map((s) => s.user_id));

  // Trainingsdagen die op vandaag (weekdag) gepland staan.
  const { data: days } = await supabase
    .from("routine_days")
    .select("name, weekday, routine:routines!inner(user_id)")
    .eq("weekday", appWeekday);
  const trainingDayName = new Map<string, string>();
  for (const d of (days ?? []) as unknown as {
    name: string;
    routine: { user_id: string } | null;
  }[]) {
    const uid = d.routine?.user_id;
    if (uid && enabled.has(uid) && !trainingDayName.has(uid)) {
      trainingDayName.set(uid, d.name);
    }
  }

  type Notif = {
    user_id: string;
    actor_id: null;
    type: string;
    data: Record<string, string>;
  };
  const notifs: Notif[] = [];
  const reminded = new Set<string>();

  // 1) Trainingsdag vandaag.
  for (const [uid, dayName] of trainingDayName) {
    if (trainedToday.has(uid)) continue;
    reminded.add(uid);
    const lang = enabled.get(uid)!;
    const data = { day: dayName };
    notifs.push({ user_id: uid, actor_id: null, type: "reminder_trainingday", data });
    await sendPush(subsByUser.get(uid) ?? [], {
      title: "GymApp",
      body: renderNotification(lang, "reminder_trainingday", data),
      url: "/dashboard",
    });
  }

  // 2) Inactiviteit (precies 3 of 7 dagen) — geen dubbele nudge.
  const candidates = [...enabled.keys()].filter(
    (u) => !reminded.has(u) && !trainedToday.has(u),
  );
  if (candidates.length) {
    const { data: lastSessions } = await supabase
      .from("workout_sessions")
      .select("user_id, performed_at")
      .in("user_id", candidates)
      .order("performed_at", { ascending: false });
    const lastByUser = new Map<string, string>();
    for (const s of lastSessions ?? []) {
      if (!lastByUser.has(s.user_id)) lastByUser.set(s.user_id, s.performed_at);
    }
    for (const uid of candidates) {
      const last = lastByUser.get(uid);
      if (!last) continue;
      const daysSince = Math.floor(
        (now.getTime() - new Date(last).getTime()) / 86400000,
      );
      if (daysSince === 3 || daysSince === 7) {
        const lang = enabled.get(uid)!;
        const data = { days: String(daysSince) };
        notifs.push({ user_id: uid, actor_id: null, type: "reminder_inactive", data });
        await sendPush(subsByUser.get(uid) ?? [], {
          title: "GymApp",
          body: renderNotification(lang, "reminder_inactive", data),
          url: "/dashboard",
        });
      }
    }
  }

  if (notifs.length) await supabase.from("notifications").insert(notifs);
  return NextResponse.json({ ok: true, sent: notifs.length });
}
