import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { updateProfile } from "@/app/settings/actions";
import { getT } from "@/lib/serverLang";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, weight_unit, username, bio")
    .eq("id", user?.id ?? "")
    .single();

  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";

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

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t("set.username")}
            </span>
            <input
              name="username"
              defaultValue={profile?.username ?? ""}
              placeholder={t("set.usernamePh")}
              className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t("set.bio")}
            </span>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              rows={2}
              placeholder={t("set.bioPh")}
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

        <p className="mt-4 text-xs text-faint">{t("set.langInHeader")}</p>
      </main>
    </>
  );
}
