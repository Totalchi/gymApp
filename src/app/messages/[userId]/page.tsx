import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { sendMessage } from "@/app/messages/actions";
import { isUuid } from "@/lib/text";

function nameOf(p?: { display_name: string | null; username: string | null }) {
  return p?.display_name || (p?.username ? `@${p.username}` : "Atleet");
}

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  // Actieve coach-relatie vereist (in één van beide richtingen).
  const { data: rel } = await supabase
    .from("coach_clients")
    .select("coach_id, client_id")
    .eq("status", "active")
    .or(
      `and(coach_id.eq.${user?.id ?? ""},client_id.eq.${userId}),and(coach_id.eq.${userId},client_id.eq.${user?.id ?? ""})`,
    )
    .maybeSingle();
  if (!rel) notFound();

  const { data: other } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", userId)
    .maybeSingle();

  const { data: messages } = await supabase
    .from("coach_messages")
    .select("id, sender_id, body, created_at")
    .eq("coach_id", rel.coach_id)
    .eq("client_id", rel.client_id)
    .order("created_at", { ascending: true })
    .limit(200);

  // Markeer chat-notificaties van deze persoon als gelezen.
  if (user) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("actor_id", userId)
      .eq("type", "coach_message")
      .is("read_at", null);
  }

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-xl flex-col px-4 pb-4 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <Link href="/coach" className="text-sm text-muted hover:text-fg">
            ←
          </Link>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
            {nameOf(other ?? undefined).replace("@", "").charAt(0).toUpperCase()}
          </span>
          <h1 className="text-lg font-bold">{nameOf(other ?? undefined)}</h1>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-line bg-surface p-3">
          {!messages || messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-faint">{t("msg.empty")}</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-fg"
                        : "bg-surface2 text-fg"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`mt-0.5 text-[10px] ${mine ? "text-primary-fg/70" : "text-faint"}`}
                    >
                      {new Date(m.created_at).toLocaleString(loc, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form action={sendMessage} className="mt-3 flex gap-2">
          <input type="hidden" name="other_id" value={userId} />
          <input
            name="body"
            autoComplete="off"
            placeholder={t("msg.placeholder")}
            className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition hover:brightness-110">
            {t("msg.send")}
          </button>
        </form>
      </main>
    </>
  );
}
