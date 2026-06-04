import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
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

  const [{ count: followers }, { count: following }, { data: amF }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user?.id ?? "")
      .eq("following_id", id)
      .maybeSingle(),
  ]);
  const amFollowing = !!amF;

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, day_name, performed_at, workout_sets(weight, reps)")
    .eq("user_id", id)
    .eq("shared", true)
    .order("performed_at", { ascending: false })
    .limit(20);

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-fg">
            {nameOf(profile ?? undefined).replace("@", "").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">{nameOf(profile ?? undefined)}</h1>
            {profile?.username && (
              <p className="text-sm text-faint">@{profile.username}</p>
            )}
          </div>
          {!isSelf && user && (
            <form action={toggleFollow}>
              <input type="hidden" name="target_id" value={id} />
              <button
                type="submit"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  amFollowing
                    ? "border border-line text-fg hover:bg-surface2"
                    : "bg-primary text-primary-fg hover:brightness-110"
                }`}
              >
                {amFollowing ? t("social.unfollow") : t("social.follow")}
              </button>
            </form>
          )}
        </div>

        {profile?.bio && <p className="mb-4 text-sm text-muted">{profile.bio}</p>}

        <div className="mb-6 flex gap-6 text-sm">
          <span>
            <strong>{followers ?? 0}</strong>{" "}
            <span className="text-faint">{t("social.followers")}</span>
          </span>
          <span>
            <strong>{following ?? 0}</strong>{" "}
            <span className="text-faint">{t("social.following")}</span>
          </span>
        </div>

        {!sessions || sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-faint">
            {t("social.noWorkouts")}
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const sets = (s.workout_sets ?? []) as { weight: number | null; reps: number | null }[];
              const vol = sets.reduce((n, x) => n + (x.weight ?? 0) * (x.reps ?? 0), 0);
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
