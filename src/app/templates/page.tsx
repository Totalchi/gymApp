import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { addTemplate } from "@/app/routines/actions";
import { ROUTINE_TEMPLATES } from "@/lib/templates";
import { DAY_TYPE_COLORS } from "@/lib/types";
import { getT } from "@/lib/serverLang";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("tpl.title")}</h1>
        <p className="mb-6 text-muted">{t("tpl.subtitle")}</p>

        <div className="space-y-4">
          {ROUTINE_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{tpl.name}</h2>
                  <p className="mt-0.5 text-sm text-muted">{tpl.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-surface2 px-2.5 py-1 text-xs text-muted">
                  {tpl.level}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {tpl.days.map((d, i) => (
                  <span
                    key={i}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[d.dayType]}`}
                  >
                    {d.name} · {d.exercises.length} {t("tpl.exShort")}
                  </span>
                ))}
              </div>

              <form action={addTemplate} className="mt-4">
                <input type="hidden" name="template_id" value={tpl.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110"
                >
                  {t("tpl.add")}
                </button>
              </form>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-faint">{t("tpl.tip")}</p>
      </main>
    </>
  );
}
