import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { assignRoutine } from "@/app/coach/actions";

function nameOf(p?: { display_name: string | null; username: string | null }) {
  return p?.display_name || (p?.username ? `@${p.username}` : "Atleet");
}

export default async function CoachClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  // Actieve coach-relatie vereist.
  const { data: rel } = await supabase
    .from("coach_clients")
    .select("id")
    .eq("coach_id", user?.id ?? "")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  if (!rel) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", clientId)
    .maybeSingle();

  // Recente workouts van de cliënt (zichtbaar dankzij coach-leesrecht).
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, day_name, performed_at, workout_sets(weight, reps, unilateral)")
    .eq("user_id", clientId)
    .not("completed_at", "is", null)
    .order("performed_at", { ascending: false })
    .limit(15);

  // Eigen schema's om toe te wijzen.
  const { data: myRoutines } = await supabase
    .from("routines")
    .select("id, name")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  // Schema's die deze coach al aan de cliënt heeft toegewezen (bewerkbaar).
  const { data: assignedRoutines } = await supabase
    .from("routines")
    .select("id, name")
    .eq("user_id", clientId)
    .eq("assigned_by", user?.id ?? "")
    .order("created_at", { ascending: false });

  // Gedeelde progressiefoto's van de cliënt.
  const { data: photos } = await supabase
    .from("progress_photos")
    .select("id, url, taken_on")
    .eq("user_id", clientId)
    .eq("shared_with_coach", true)
    .order("taken_on", { ascending: false })
    .limit(24);

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <Link href="/coach" className="text-sm text-muted hover:text-fg">
          ← {t("coach.title")}
        </Link>

        <div className="mb-6 mt-2 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-fg">
            {nameOf(profile ?? undefined).replace("@", "").charAt(0).toUpperCase()}
          </span>
          <h1 className="flex-1 truncate text-2xl font-bold">
            {nameOf(profile ?? undefined)}
          </h1>
          <Link
            href={`/messages/${clientId}`}
            className="shrink-0 btn-primary px-4 py-2 text-sm"
          >
            💬 {t("coach.message")}
          </Link>
        </div>

        {/* Schema toewijzen */}
        <section className="mb-6 card-flat p-5">
          <h2 className="mb-3 font-semibold">{t("coach.assign")}</h2>
          {!myRoutines || myRoutines.length === 0 ? (
            <p className="text-sm text-faint">{t("coach.noOwnRoutines")}</p>
          ) : (
            <form action={assignRoutine} className="flex gap-2">
              <input type="hidden" name="client_id" value={clientId} />
              <select
                name="routine_id"
                className="flex-1 input px-3"
              >
                {myRoutines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button className="btn-primary px-4 text-sm">
                {t("coach.assignBtn")}
              </button>
            </form>
          )}
          <p className="mt-2 text-xs text-faint">{t("coach.assignHint")}</p>
        </section>

        {/* Toegewezen schema's — bewerkbaar door de coach */}
        {assignedRoutines && assignedRoutines.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
              {t("coach.assignedRoutines")}
            </h2>
            <div className="space-y-2">
              {assignedRoutines.map((r) => (
                <Link
                  key={r.id}
                  href={`/routines/${r.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-primary/40"
                >
                  <span className="text-lg">📋</span>
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="text-sm text-primary">{t("coach.editRoutine")}</span>
                  <span className="text-faint">›</span>
                </Link>
              ))}
            </div>
            <p className="mt-2 text-xs text-faint">{t("coach.assignedHint")}</p>
          </section>
        )}

        {/* Gedeelde progressiefoto's */}
        {photos && photos.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
              {t("photos.title")}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                  <div className="relative aspect-square bg-canvas">
                    <Image src={p.url} alt="" fill sizes="33vw" className="object-cover" />
                  </div>
                  <p className="px-2 py-1 text-[11px] text-faint">
                    {new Date(p.taken_on).toLocaleDateString(loc, { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recente workouts */}
        <h2 className="mb-2 font-semibold">{t("coach.recentWorkouts")}</h2>
        {!sessions || sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-faint">
            {t("coach.noClientWorkouts")}
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const sets = (s.workout_sets ?? []) as { weight: number | null; reps: number | null; unilateral: boolean | null }[];
              const vol = sets.reduce((n, x) => n + (x.weight ?? 0) * (x.reps ?? 0) * (x.unilateral ? 2 : 1), 0);
              return (
                <Link
                  key={s.id}
                  href={`/w/${s.id}`}
                  className="block rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-primary/40"
                >
                  <p className="font-medium">{s.day_name ?? "Workout"}</p>
                  <p className="text-xs text-faint">
                    {new Date(s.performed_at).toLocaleDateString(loc, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {sets.length} {t("hist.sets")} · {Math.round(vol).toLocaleString()} kg
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
