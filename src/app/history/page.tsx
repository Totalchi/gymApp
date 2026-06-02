import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { deleteSession } from "@/app/workout/actions";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, day_name, performed_at, notes, workout_sets(reps, weight)")
    .order("performed_at", { ascending: false });

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Geschiedenis</h1>
          <Link
            href="/progress"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-rose-500 hover:text-rose-400"
          >
            📈 Voortgang
          </Link>
        </div>

        {!sessions || sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center text-slate-500">
            Nog geen workouts gelogd. Start er één vanaf een dag in je schema! 💪
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const sets = (s.workout_sets ?? []) as {
                reps: number | null;
                weight: number | null;
              }[];
              const volume = sets.reduce(
                (sum, st) => sum + (st.reps ?? 0) * (st.weight ?? 0),
                0,
              );
              const date = new Date(s.performed_at).toLocaleDateString("nl-NL", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
                >
                  <Link href={`/workout/${s.id}`} className="min-w-0 flex-1">
                    <p className="font-semibold">{s.day_name ?? "Workout"}</p>
                    <p className="text-sm text-slate-400">{date}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {sets.length} sets · {Math.round(volume).toLocaleString("nl-NL")} kg volume
                    </p>
                  </Link>
                  <form action={deleteSession}>
                    <input type="hidden" name="id" value={s.id} />
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
