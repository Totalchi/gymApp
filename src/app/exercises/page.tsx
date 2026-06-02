import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { ExerciseBrowser } from "@/components/ExerciseBrowser";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">Oefeningen</h1>
        <p className="mb-6 text-slate-400">
          Blader door de oefeningen-bibliotheek met afbeeldingen en uitleg.
        </p>
        <ExerciseBrowser />
      </main>
    </>
  );
}
