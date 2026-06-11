import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { signout } from "@/app/login/actions";

function Row({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface2"
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-faint">›</span>
    </Link>
  );
}

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const name = profile?.display_name || profile?.username || "Atleet";
  const initial = name.charAt(0).toUpperCase();

  const sections: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
    {
      title: t("menu.social"),
      items: [
        { href: "/feed", label: t("feed.title"), icon: "👥" },
        { href: "/people", label: t("social.findTitle"), icon: "🔍" },
        { href: "/coach", label: t("coach.title"), icon: "🧑‍🏫" },
      ],
    },
    {
      title: t("menu.training"),
      items: [
        { href: "/templates", label: t("nav.programs"), icon: "📋" },
        { href: "/goals", label: t("nav.goals"), icon: "🎯" },
        { href: "/progress", label: t("nav.progress"), icon: "📈" },
        { href: "/stats", label: t("nav.stats"), icon: "📊" },
        { href: "/body", label: t("nav.body"), icon: "⚖️" },
        { href: "/body#photos", label: t("photos.title"), icon: "📸" },
        { href: "/nutrition", label: t("nutri.title"), icon: "🥗" },
        { href: "/achievements", label: t("ach.title"), icon: "🏅" },
      ],
    },
  ];

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-4 text-3xl font-bold">{t("nav.more")}</h1>

        {/* Profielkaart */}
        <Link
          href={user ? `/u/${user.id}` : "/feed"}
          className="mb-6 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-primary/40"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-fg">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{name}</p>
            <p className="text-sm text-faint">{t("social.myProfile")}</p>
          </div>
          <span className="text-faint">›</span>
        </Link>

        <div className="space-y-6">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-faint">
                {s.title}
              </h2>
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
                {s.items.map((it) => (
                  <Row key={it.href} {...it} />
                ))}
              </div>
            </div>
          ))}

          {/* Account */}
          <div>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-faint">
              {t("menu.account")}
            </h2>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
              <Row href="/notifications" label={t("notif.title")} icon="🔔" />
              <Row href="/settings" label={t("nav.settings")} icon="⚙️" />
              <form action={signout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface2"
                >
                  <span className="text-lg">↩</span>
                  <span className="flex-1 font-medium text-danger">{t("nav.logout")}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
