import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { ExercisesView } from "@/components/ExercisesView";
import { getT } from "@/lib/serverLang";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("ex.title")}</h1>
        <p className="mb-6 text-muted">{t("ex.subtitle")}</p>
        <ExercisesView />
      </main>
    </>
  );
}
