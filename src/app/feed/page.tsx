import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { toggleLike } from "@/app/social/actions";

function nameOf(p?: { display_name: string | null; username: string | null }) {
  return p?.display_name || (p?.username ? `@${p.username}` : "Atleet");
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  const { data: sessionsData } = await supabase
    .from("workout_sessions")
    .select("id, user_id, day_name, performed_at, workout_sets(weight, reps, exercise_name)")
    .eq("shared", true)
    .order("performed_at", { ascending: false })
    .limit(40);
  const sessions = sessionsData ?? [];
  const ids = sessions.map((s) => s.id);
  const userIds = [...new Set(sessions.map((s) => s.user_id))];

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", userIds.length ? userIds : ["__none__"]);
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  const { data: likes } = await supabase
    .from("likes")
    .select("session_id, user_id")
    .in("session_id", ids.length ? ids : ["__none__"]);
  const likeCount: Record<string, number> = {};
  const likedByMe: Record<string, boolean> = {};
  for (const l of likes ?? []) {
    likeCount[l.session_id] = (likeCount[l.session_id] ?? 0) + 1;
    if (l.user_id === user?.id) likedByMe[l.session_id] = true;
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("session_id")
    .in("session_id", ids.length ? ids : ["__none__"]);
  const commentCount: Record<string, number> = {};
  for (const c of comments ?? []) commentCount[c.session_id] = (commentCount[c.session_id] ?? 0) + 1;

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("feed.title")}</h1>
          <Link
            href="/people"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg transition hover:border-primary hover:text-primary"
          >
            {t("feed.findPeople")}
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-faint">
            {t("feed.empty")}{" "}
            <Link href="/people" className="text-primary hover:underline">
              {t("feed.findPeople")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => {
              const sets = (s.workout_sets ?? []) as {
                weight: number | null;
                reps: number | null;
                exercise_name: string | null;
              }[];
              const volume = sets.reduce((n, x) => n + (x.weight ?? 0) * (x.reps ?? 0), 0);
              const exNames = [...new Set(sets.map((x) => x.exercise_name).filter(Boolean))].slice(0, 4);
              const p = profById.get(s.user_id);
              const initial = nameOf(p).replace("@", "").charAt(0).toUpperCase();
              return (
                <article key={s.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Link
                      href={`/u/${s.user_id}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg"
                    >
                      {initial}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/u/${s.user_id}`} className="truncate font-medium hover:text-primary">
                        {nameOf(p)}
                      </Link>
                      <p className="text-xs text-faint">
                        {new Date(s.performed_at).toLocaleDateString(loc, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <Link href={`/w/${s.id}`} className="block">
                    <p className="font-semibold">{s.day_name ?? "Workout"}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {sets.length} {t("hist.sets")} · {Math.round(volume).toLocaleString()} kg
                    </p>
                    {exNames.length > 0 && (
                      <p className="mt-1 truncate text-xs text-faint">{exNames.join(" · ")}</p>
                    )}
                  </Link>

                  <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-sm">
                    <form action={toggleLike}>
                      <input type="hidden" name="session_id" value={s.id} />
                      <button
                        type="submit"
                        className={`flex items-center gap-1 transition ${
                          likedByMe[s.id] ? "text-rose-400" : "text-muted hover:text-rose-400"
                        }`}
                      >
                        {likedByMe[s.id] ? "♥" : "♡"} {likeCount[s.id] ?? 0}
                      </button>
                    </form>
                    <Link href={`/w/${s.id}`} className="flex items-center gap-1 text-muted hover:text-primary">
                      💬 {commentCount[s.id] ?? 0}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
