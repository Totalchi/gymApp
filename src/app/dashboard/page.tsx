import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { createRoutine, deleteRoutine } from "@/app/routines/actions";
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS, type DayType } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, description, created_at, routine_days(day_type)")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mijn schema&apos;s</h1>
          <p className="mt-1 text-slate-400">
            Bouw wekelijkse trainingsschema&apos;s met push/pull/legs-dagen,
            sets, reps, kg en automatische RIR.
          </p>
        </div>

        {/* Nieuw schema */}
        <form
          action={createRoutine}
          className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
        >
          <h2 className="mb-3 font-semibold">Nieuw schema</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="name"
              required
              placeholder="Bijv. Push / Pull / Legs"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
            />
            <input
              name="description"
              placeholder="Korte omschrijving (optioneel)"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90"
            >
              Aanmaken
            </button>
          </div>
        </form>

        {/* Lijst */}
        {!routines || routines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center text-slate-500">
            Nog geen schema&apos;s. Maak je eerste schema hierboven aan! 💪
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((r) => {
              const dayTypes = [
                ...new Set(
                  (r.routine_days as { day_type: DayType }[]).map(
                    (d) => d.day_type,
                  ),
                ),
              ];
              return (
                <div
                  key={r.id}
                  className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700"
                >
                  <Link href={`/routines/${r.id}`} className="flex-1">
                    <h3 className="text-lg font-semibold group-hover:text-rose-400">
                      {r.name}
                    </h3>
                    {r.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {r.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {dayTypes.length === 0 ? (
                        <span className="text-xs text-slate-500">
                          Nog geen dagen
                        </span>
                      ) : (
                        dayTypes.map((t) => (
                          <span
                            key={t}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[t]}`}
                          >
                            {DAY_TYPE_LABELS[t]}
                          </span>
                        ))
                      )}
                    </div>
                  </Link>
                  <form action={deleteRoutine} className="mt-4">
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-xs text-slate-500 transition hover:text-rose-400"
                    >
                      Verwijderen
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
