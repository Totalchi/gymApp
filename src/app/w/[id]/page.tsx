import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { toggleLike, addComment, deleteComment } from "@/app/social/actions";
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
  const commenterIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: cProfs } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", commenterIds.length ? commenterIds : ["__none__"]);
  const cProfById = new Map((cProfs ?? []).map((p) => [p.id, p]));

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
          <form action={toggleLike}>
            <input type="hidden" name="session_id" value={id} />
            <button
              type="submit"
              className={`flex items-center gap-1 transition ${
                likedByMe ? "text-rose-400" : "text-muted hover:text-rose-400"
              }`}
            >
              {likedByMe ? "♥" : "♡"} {likeCount}
            </button>
          </form>
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

        {/* Comments */}
        <h2 className="mb-2 mt-6 font-semibold">{t("feed.comments")}</h2>
        <form action={addComment} className="mb-4 flex gap-2">
          <input type="hidden" name="session_id" value={id} />
          <input
            name="body"
            required
            maxLength={500}
            placeholder={t("feed.commentPh")}
            className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition hover:brightness-110"
          >
            {t("feed.send")}
          </button>
        </form>

        {comments.length === 0 ? (
          <p className="text-sm text-faint">{t("feed.noComments")}</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/u/${c.user_id}`} className="text-sm font-medium hover:text-primary">
                    {nameOf(cProfById.get(c.user_id))}
                  </Link>
                  <p className="text-sm text-muted">{c.body}</p>
                </div>
                {c.user_id === user?.id && (
                  <form action={deleteComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="session_id" value={id} />
                    <button type="submit" className="shrink-0 text-xs text-faint hover:text-danger">
                      {t("common.delete")}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
