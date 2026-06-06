import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { toggleFollow } from "@/app/social/actions";
import { sanitizeFilter } from "@/lib/text";

function nameOf(p: { display_name: string | null; username: string | null }) {
  return p.display_name || (p.username ? `@${p.username}` : "Atleet");
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();
  const { q = "" } = await searchParams;
  const query = q.trim();

  let people: { id: string; display_name: string | null; username: string | null }[] = [];
  if (query) {
    const safe = sanitizeFilter(query);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%`)
      .limit(30);
    people = (data ?? []).filter((p) => p.id !== user?.id);
  }

  // Wie volg ik al (of heb ik aangevraagd)?
  const { data: myFollows } = await supabase
    .from("follows")
    .select("following_id, status")
    .eq("follower_id", user?.id ?? "");
  const followStatus = new Map(
    (myFollows ?? []).map((f) => [f.following_id, f.status as string]),
  );

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("social.findTitle")}</h1>
        <p className="mb-5 text-muted">{t("social.findSub")}</p>

        <form method="get" className="mb-6 flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder={t("social.searchPh")}
            className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition hover:brightness-110"
          >
            {t("social.search")}
          </button>
        </form>

        {query && people.length === 0 ? (
          <p className="text-sm text-faint">{t("social.noResults")}</p>
        ) : (
          <div className="space-y-2">
            {people.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <Link
                  href={`/u/${p.id}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg"
                >
                  {nameOf(p).replace("@", "").charAt(0).toUpperCase()}
                </Link>
                <Link href={`/u/${p.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">
                  {nameOf(p)}
                </Link>
                <form action={toggleFollow}>
                  <input type="hidden" name="target_id" value={p.id} />
                  <button
                    type="submit"
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      followStatus.has(p.id)
                        ? "border border-line text-fg hover:bg-surface2"
                        : "bg-primary text-primary-fg hover:brightness-110"
                    }`}
                  >
                    {followStatus.get(p.id) === "accepted"
                      ? t("social.unfollow")
                      : followStatus.get(p.id) === "pending"
                        ? t("social.requested")
                        : t("social.follow")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
