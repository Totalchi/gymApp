import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { LikeButton } from "@/components/LikeButton";
import { CommentBox, type CommentItem } from "@/components/CommentBox";
import type { WorkoutSet } from "@/lib/types";

function nameOf(p?: { display_name: string | null; username: string | null }) {
  return p?.display_name || (p?.username ? `@${p.username}` : "Atleet");
}

export default async function WorkoutDetailPage({
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

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, user_id, day_name, performed_at, duration_seconds, notes")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("session_id", id)
    .order("position")
    .order("set_number");
  const setRows = (sets ?? []) as WorkoutSet[];

  const exIds = [...new Set(setRows.map((s) => s.exercise_id))];
  const { data: exs } = await supabase
    .from("exercises")
    .select("id, name, image_urls")
    .in("id", exIds.length ? exIds : ["__none__"]);
  const exMeta = new Map((exs ?? []).map((e) => [e.id, e]));

  // groepeer per oefening
  const groups: { id: string; name: string; image: string | null; sets: WorkoutSet[] }[] = [];
  const idx = new Map<string, number>();
  for (const s of setRows) {
    let gi = idx.get(s.exercise_id);
    if (gi === undefined) {
      gi = groups.length;
      idx.set(s.exercise_id, gi);
      const m = exMeta.get(s.exercise_id);
      groups.push({
        id: s.exercise_id,
        name: m?.name ?? s.exercise_name ?? "Oefening",
        image: (m?.image_urls?.[0] as string) ?? null,
        sets: [],
      });
    }
    groups[gi].sets.push(s);
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("id", session.user_id)
    .maybeSingle();

  const { data: likes } = await supabase
    .from("likes")
    .select("user_id")
    .eq("session_id", id);
  const likeCount = (likes ?? []).length;
  const likedByMe = (likes ?? []).some((l) => l.user_id === user?.id);

  const { data: commentsData } = await supabase
    .from("comments")
    .select("id, user_id, body, created_at")
    .eq("session_id", id)
    .order("created_at");
  const comments = commentsData ?? [];
  const commenterIds = [...new Set([...comments.map((c) => c.user_id), user?.id].filter(Boolean) as string[])];
  const { data: cProfs } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", commenterIds.length ? commenterIds : ["__none__"]);
  const cProfById = new Map((cProfs ?? []).map((p) => [p.id, p]));
  const commentItems: CommentItem[] = comments.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    body: c.body,
    name: nameOf(cProfById.get(c.user_id)),
  }));
  const currentUserName = user ? nameOf(cProfById.get(user.id)) : "Atleet";

  const volume = setRows.reduce((n, s) => n + (s.weight ?? 0) * (s.reps ?? 0) * (s.unilateral ? 2 : 1), 0);

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <Link href="/feed" className="text-sm text-muted hover:text-fg">
          ← {t("feed.title")}
        </Link>

        <div className="mb-4 mt-2 flex items-center gap-3">
          <Link
            href={`/u/${session.user_id}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg"
          >
            {nameOf(owner ?? undefined).replace("@", "").charAt(0).toUpperCase()}
          </Link>
          <div>
            <Link href={`/u/${session.user_id}`} className="font-medium hover:text-primary">
              {nameOf(owner ?? undefined)}
            </Link>
            <p className="text-xs text-faint">
              {new Date(session.performed_at).toLocaleDateString(loc, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-bold">{session.day_name ?? "Workout"}</h1>
        <p className="mb-4 text-sm text-muted">
          {setRows.length} {t("hist.sets")} · {Math.round(volume).toLocaleString()} kg
          {session.duration_seconds ? ` · ⏱ ${Math.round(session.duration_seconds / 60)} ${t("hist.min")}` : ""}
        </p>

        {/* Like + comment-teller */}
        <div className="mb-5 flex items-center gap-4 border-y border-line py-3 text-sm">
          <LikeButton sessionId={id} liked={likedByMe} count={likeCount} />
          <span className="flex items-center gap-1 text-muted">💬 {comments.length}</span>
        </div>

        {/* Oefeningen (alleen-lezen) */}
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line">
                  {g.image ? (
                    <Image src={g.image} alt={g.name} fill sizes="36px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm">🏋️</div>
                  )}
                </div>
                <h2 className="font-semibold">{g.name}</h2>
              </div>
              <div className="space-y-1 text-sm">
                {g.sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-muted">
                    <span className="w-5 text-faint">
                      {s.set_type === "warmup" ? "W" : i + 1}
                    </span>
                    <span className="tabular-nums">
                      {s.weight ?? "—"} kg × {s.reps ?? "—"}
                    </span>
                    {s.rir != null && <span className="text-xs text-faint">RIR {s.rir}</span>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Comments (optimistisch — geen herlaad bij plaatsen) */}
        <CommentBox
          sessionId={id}
          currentUserId={user?.id ?? null}
          currentUserName={currentUserName}
          initial={commentItems}
          labels={{
            comments: t("feed.comments"),
            placeholder: t("feed.commentPh"),
            send: t("feed.send"),
            none: t("feed.noComments"),
            delete: t("common.delete"),
          }}
        />
      </main>
    </>
  );
}
