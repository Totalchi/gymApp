import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { PeopleList } from "@/components/PeopleList";
import { getT } from "@/lib/serverLang";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  const { data: rows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", id)
    .eq("status", "accepted");
  const ids = (rows ?? []).map((r) => r.following_id);

  const { data: people } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", ids.length ? ids : ["__none__"]);

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <Link href={`/u/${id}`} className="text-sm text-muted hover:text-fg">
          ← {t("common.back")}
        </Link>
        <h1 className="mb-4 mt-2 text-2xl font-bold">{t("social.following")}</h1>
        <PeopleList people={people ?? []} empty={t("social.noFollowing")} />
      </main>
    </>
  );
}
