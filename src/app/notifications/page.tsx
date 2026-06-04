import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { EnablePushButton } from "@/components/EnablePushButton";
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

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-16 text-center text-sm text-faint">
            {t("notif.empty")}
          </p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {items.map((n) => {
              const msg = renderNotification(lang, n.type, n.data);
              const href = notificationLink(n.type, n.data);
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
