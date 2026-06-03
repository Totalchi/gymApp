import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { deleteSession } from "@/app/workout/actions";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, day_name, performed_at, notes, duration_seconds, workout_sets(reps, weight)")
    .order("performed_at", { ascending: false });

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("hist.title")}</h1>
          <Link
            href="/progress"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg transition hover:border-primary hover:text-primary"
          >
            {t("hist.progress")}
          </Link>
        </div>

        {!sessions || sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-faint">
            {t("hist.empty")}
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
              const date = new Date(s.performed_at).toLocaleDateString(loc, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
                >
                  <Link href={`/workout/${s.id}`} className="min-w-0 flex-1">
                    <p className="font-semibold">{s.day_name ?? "Workout"}</p>
                    <p className="text-sm text-muted">{date}</p>
                    <p className="mt-1 text-xs text-faint">
                      {sets.length} {t("hist.sets")} · {Math.round(volume).toLocaleString()} kg {t("hist.volume")}
                      {s.duration_seconds
                        ? ` · ⏱ ${Math.round(s.duration_seconds / 60)} ${t("hist.min")}`
                        : ""}
                    </p>
                  </Link>
                  <form action={deleteSession}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs text-faint transition hover:text-danger"
                    >
                      {t("common.delete")}
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
