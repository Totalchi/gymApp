import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { EnablePushButton } from "@/components/EnablePushButton";
import { acceptFollow, declineFollow } from "@/app/social/actions";
import { setReminders } from "@/app/notifications/actions";
import { getT } from "@/lib/serverLang";
import {
  notificationIcon,
  notificationLink,
  renderNotification,
  type NotificationRow,
} from "@/lib/notifications";

function timeAgo(iso: string, lang: "nl" | "en"): string {
  const rtf = new Intl.RelativeTimeFormat(lang === "en" ? "en" : "nl", {
    numeric: "auto",
  });
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return rtf.format(-sec, "second");
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  if (day < 30) return rtf.format(-day, "day");
  const month = Math.round(day / 30);
  return rtf.format(-month, "month");
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();

  const { data } = await supabase
    .from("notifications")
    .select("id, actor_id, type, data, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as NotificationRow[];

  const { data: profile } = await supabase
    .from("profiles")
    .select("reminders_enabled")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const remindersOn = profile?.reminders_enabled !== false;

  // Markeer ongelezen als gelezen (bij het openen van deze pagina).
  if (user && items.some((n) => !n.read_at)) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("notif.title")}</h1>

        <EnablePushButton />

        <form
          action={setReminders}
          className="mb-4 flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
        >
          <span className="text-sm">{t("notif.reminders")}</span>
          <input type="hidden" name="enabled" value={remindersOn ? "false" : "true"} />
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              remindersOn
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-surface2 text-faint ring-1 ring-line"
            }`}
          >
            {remindersOn ? t("notif.on") : t("notif.off")}
          </button>
        </form>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-16 text-center text-sm text-faint">
            {t("notif.empty")}
          </p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {items.map((n) => {
              const msg = renderNotification(lang, n.type, n.data);
              const href = notificationLink(n.type, n.data);
              // Volgverzoek: toon accepteren/weigeren-knoppen i.p.v. een link.
              if (n.type === "follow_request" && n.actor_id) {
                return (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3.5">
                    <span className="text-xl leading-none">{notificationIcon(n.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{msg}</p>
                      <p className="mt-0.5 text-xs text-faint">{timeAgo(n.created_at, lang)}</p>
                      <div className="mt-2 flex gap-2">
                        <form action={acceptFollow}>
                          <input type="hidden" name="follower_id" value={n.actor_id} />
                          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg">
                            {t("social.accept")}
                          </button>
                        </form>
                        <form action={declineFollow}>
                          <input type="hidden" name="follower_id" value={n.actor_id} />
                          <button className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-danger">
                            {t("social.decline")}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              }

              const body = (
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span className="text-xl leading-none">
                    {notificationIcon(n.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{msg}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {timeAgo(n.created_at, lang)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              );
              return href ? (
                <Link
                  key={n.id}
                  href={href}
                  className="block transition hover:bg-surface2"
                >
                  {body}
                </Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
