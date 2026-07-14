import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { getT } from "@/lib/serverLang";
import { toggleFollow } from "@/app/social/actions";

function nameOf(p?: { display_name: string | null; username: string | null }) {
  return p?.display_name || (p?.username ? `@${p.username}` : "Atleet");
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio")
    .eq("id", id)
    .maybeSingle();

  const isSelf = user?.id === id;

  const [
    { count: followers },
    { count: following },
    { count: workoutCount },
    { data: amF },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", id)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", id)
      .eq("status", "accepted"),
    supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("shared", true)
      .not("completed_at", "is", null),
    supabase
      .from("follows")
      .select("status")
      .eq("follower_id", user?.id ?? "")
      .eq("following_id", id)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id, day_name, performed_at, workout_sets(weight, reps, unilateral)")
      .eq("user_id", id)
      .eq("shared", true)
      .not("completed_at", "is", null)
      .order("performed_at", { ascending: false })
      .limit(20),
  ]);

  const followState: "none" | "pending" | "accepted" =
    amF?.status === "accepted" ? "accepted" : amF ? "pending" : "none";
  const name = nameOf(profile ?? undefined);
  const initial = name.replace("@", "").charAt(0).toUpperCase();

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-6">
        {/* Banner + avatar */}
        <div className="h-24 rounded-3xl bg-gradient-to-br from-primary/40 via-primary/15 to-transparent" />
        <div className="-mt-10 mb-4 flex items-end gap-4 px-1">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-fg shadow-[var(--shadow-lg)] ring-4 ring-canvas">
            {initial}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">{name}</h1>
            {profile?.username && (
              <p className="truncate text-sm text-faint">@{profile.username}</p>
            )}
          </div>
          {!isSelf && user && (
            <form action={toggleFollow} className="pb-1">
              <input type="hidden" name="target_id" value={id} />
              <button
                type="submit"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  followState === "none"
                    ? "btn-primary"
                    : "border border-line text-fg hover:bg-surface2"
                }`}
              >
                {followState === "accepted"
                  ? t("social.unfollow")
                  : followState === "pending"
                    ? t("social.requested")
                    : t("social.follow")}
              </button>
            </form>
          )}
        </div>

        {profile?.bio && <p className="mb-4 px-1 text-sm text-muted">{profile.bio}</p>}

        {/* Stat-strip */}
        <div className="mb-6 grid grid-cols-3 divide-x divide-line overflow-hidden card">
          <div className="px-3 py-3 text-center">
            <p className="text-xl font-bold tabular-nums">{workoutCount ?? 0}</p>
            <p className="text-xs text-faint">{t("dash.workouts")}</p>
          </div>
          <Link href={`/u/${id}/followers`} className="px-3 py-3 text-center transition hover:bg-surface2">
            <p className="text-xl font-bold tabular-nums">{followers ?? 0}</p>
            <p className="text-xs text-faint">{t("social.followers")}</p>
          </Link>
          <Link href={`/u/${id}/following`} className="px-3 py-3 text-center transition hover:bg-surface2">
            <p className="text-xl font-bold tabular-nums">{following ?? 0}</p>
            <p className="text-xs text-faint">{t("social.following")}</p>
          </Link>
        </div>

        {!sessions || sessions.length === 0 ? (
          <EmptyState icon="🏋️" title={t("social.noWorkouts")} />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const sets = (s.workout_sets ?? []) as { weight: number | null; reps: number | null; unilateral: boolean | null }[];
              const vol = sets.reduce((n, x) => n + (x.weight ?? 0) * (x.reps ?? 0) * (x.unilateral ? 2 : 1), 0);
              return (
                <Link
                  key={s.id}
                  href={`/w/${s.id}`}
                  className="block card px-4 py-3 transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <p className="font-semibold">{s.day_name ?? "Workout"}</p>
                  <p className="mt-0.5 text-xs text-faint">
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
