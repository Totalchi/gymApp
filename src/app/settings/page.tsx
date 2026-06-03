import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { updateProfile, setLanguage } from "@/app/settings/actions";
import { getT, getLang } from "@/lib/serverLang";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();
  const lang = await getLang();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, weight_unit")
    .eq("id", user?.id ?? "")
    .single();

  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";

  const moreLinks = [
    { href: "/templates", label: t("nav.programs"), desc: t("set.tplDesc") },
    { href: "/progress", label: t("nav.progress"), desc: t("set.progDesc") },
    { href: "/body", label: t("nav.body"), desc: t("set.bodyDesc") },
    { href: "/stats", label: t("nav.stats"), desc: t("set.statsDesc") },
  ];

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("set.title")}</h1>

        <form
          action={updateProfile}
          className="space-y-5 rounded-2xl border border-line bg-surface p-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t("set.name")}
            </span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              placeholder={t("set.namePh")}
              className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 focus:border-primary focus:outline-none"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t("set.unit")}
            </span>
            <div className="flex gap-2">
              {(["kg", "lb"] as const).map((u) => (
                <label
                  key={u}
                  className="flex-1 cursor-pointer rounded-xl border border-line bg-canvas px-4 py-2.5 text-center font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                >
                  <input
                    type="radio"
                    name="weight_unit"
                    value={u}
                    defaultChecked={unit === u}
                    className="sr-only"
                  />
                  {u.toUpperCase()}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-faint">{t("set.unitHint")}</p>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110"
          >
            {t("common.save")}
          </button>
        </form>

        {/* Taal */}
        <form action={setLanguage} className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <span className="mb-1.5 block text-sm font-medium text-muted">
            {t("set.language")}
          </span>
          <div className="flex gap-2">
            <button
              name="lang"
              value="nl"
              className={`flex-1 rounded-xl border px-4 py-2.5 text-center font-medium transition ${
                lang === "nl"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-line hover:bg-surface2"
              }`}
            >
              🇳🇱 Nederlands
            </button>
            <button
              name="lang"
              value="en"
              className={`flex-1 rounded-xl border px-4 py-2.5 text-center font-medium transition ${
                lang === "en"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-line hover:bg-surface2"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
          <p className="mt-1.5 text-xs text-faint">{t("set.languageHint")}</p>
        </form>

        {/* Meer */}
        <h2 className="mb-2 mt-8 font-semibold">{t("set.more")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {moreLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
            >
              <p className="font-medium">{l.label}</p>
              <p className="mt-0.5 text-xs text-faint">{l.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
