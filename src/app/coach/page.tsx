import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { inviteClient, acceptCoach, removeRelation } from "@/app/coach/actions";

function nameOf(p?: { display_name: string | null; username: string | null }) {
  return p?.display_name || (p?.username ? `@${p.username}` : "Atleet");
}

export default async function CoachPage({
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

  const { data: rels } = await supabase
    .from("coach_clients")
    .select("id, coach_id, client_id, status");
  const all = rels ?? [];
  const clientsActive = all.filter((r) => r.coach_id === user?.id && r.status === "active");
  const sentPending = all.filter((r) => r.coach_id === user?.id && r.status === "pending");
  const requestsReceived = all.filter((r) => r.client_id === user?.id && r.status === "pending");
  const myCoaches = all.filter((r) => r.client_id === user?.id && r.status === "active");

  // Profielen van alle betrokken personen.
  const ids = [
    ...new Set(all.flatMap((r) => [r.coach_id, r.client_id])),
  ].filter((id) => id !== user?.id);

  let searchResults: { id: string; display_name: string | null; username: string | null }[] = [];
  if (query) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20);
    searchResults = (data ?? []).filter((p) => p.id !== user?.id);
    ids.push(...searchResults.map((p) => p.id));
  }

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", ids.length ? [...new Set(ids)] : ["__none__"]);
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  const relatedIds = new Set(
    all.flatMap((r) => [r.coach_id, r.client_id]).filter((id) => id !== user?.id),
  );

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("coach.title")}</h1>
        <p className="mb-6 text-muted">{t("coach.subtitle")}</p>

        {/* Verzoeken aan jou */}
        {requestsReceived.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
              {t("coach.requests")}
            </h2>
            <div className="space-y-2">
              {requestsReceived.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <span className="flex-1 text-sm">
                    <strong>{nameOf(profById.get(r.coach_id))}</strong> {t("coach.wantsToCoach")}
                  </span>
                  <form action={acceptCoach}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg">
                      {t("coach.accept")}
                    </button>
                  </form>
                  <form action={removeRelation}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs text-faint hover:text-danger">{t("coach.decline")}</button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Jouw coach */}
        {myCoaches.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
              {t("coach.yourCoach")}
            </h2>
            <div className="space-y-2">
              {myCoaches.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <Link href={`/u/${r.coach_id}`} className="flex-1 font-medium hover:text-primary">
                    {nameOf(profById.get(r.coach_id))}
                  </Link>
                  <Link
                    href={`/messages/${r.coach_id}`}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg"
                  >
                    💬 {t("coach.message")}
                  </Link>
                  <form action={removeRelation}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs text-faint hover:text-danger">{t("coach.stop")}</button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mijn cliënten */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
            {t("coach.myClients")}
          </h2>
          {clientsActive.length === 0 ? (
            <p className="text-sm text-faint">{t("coach.noClients")}</p>
          ) : (
            <div className="space-y-2">
              {clientsActive.map((r) => (
                <Link
                  key={r.id}
                  href={`/coach/${r.client_id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-primary/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
                    {nameOf(profById.get(r.client_id)).replace("@", "").charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 font-medium">{nameOf(profById.get(r.client_id))}</span>
                  <span className="text-faint">›</span>
                </Link>
              ))}
            </div>
          )}
          {sentPending.length > 0 && (
            <div className="mt-2 space-y-1">
              {sentPending.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-1 text-xs text-faint">
                  <span className="flex-1">
                    {nameOf(profById.get(r.client_id))} — {t("coach.pending")}
                  </span>
                  <form action={removeRelation}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="hover:text-danger">{t("coach.cancel")}</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cliënt uitnodigen */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
            {t("coach.invite")}
          </h2>
          <form method="get" className="mb-3 flex gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder={t("social.searchPh")}
              className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
            />
            <button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg">
              {t("social.search")}
            </button>
          </form>
          {query && searchResults.length === 0 && (
            <p className="text-sm text-faint">{t("social.noResults")}</p>
          )}
          <div className="space-y-2">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <span className="flex-1 truncate font-medium">{nameOf(p)}</span>
                {relatedIds.has(p.id) ? (
                  <span className="text-xs text-faint">{t("coach.already")}</span>
                ) : (
                  <form action={inviteClient}>
                    <input type="hidden" name="target_id" value={p.id} />
                    <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg">
                      {t("coach.inviteBtn")}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
