import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { addTemplate } from "@/app/routines/actions";
import { ROUTINE_TEMPLATES } from "@/lib/templates";
import { DAY_TYPE_COLORS } from "@/lib/types";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">Kant-en-klare programma&apos;s</h1>
        <p className="mb-6 text-slate-400">
          Kies een bewezen schema en voeg het met één klik toe aan je eigen
          schema&apos;s. Daarna kun je het naar wens aanpassen.
        </p>

        <div className="space-y-4">
          {ROUTINE_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{tpl.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-400">{tpl.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                  {tpl.level}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {tpl.days.map((d, i) => (
                  <span
                    key={i}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[d.dayType]}`}
                  >
                    {d.name} · {d.exercises.length} oef.
                  </span>
                ))}
              </div>

              <form action={addTemplate} className="mt-4">
                <input type="hidden" name="template_id" value={tpl.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90"
                >
                  Toevoegen aan mijn schema&apos;s
                </button>
              </form>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-600">
          Tip: deze schema&apos;s gebruiken oefeningen uit de bibliotheek. Werkt
          een oefening niet? Dan staat die nog niet in je database — draai dan de
          volledige oefeningen-seed.
        </p>
      </main>
    </>
  );
}
