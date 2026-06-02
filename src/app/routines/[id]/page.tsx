import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { RoutineDays } from "@/components/RoutineDays";
import { AddDayForm } from "@/components/AddDayForm";
import type { RoutineDayWithExercises } from "@/lib/types";

export default async function RoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, name, description")
    .eq("id", id)
    .single();

  if (!routine) notFound();

  const { data: daysRaw } = await supabase
    .from("routine_days")
    .select(
      "*, routine_exercises(*, exercise:exercises(*))",
    )
    .eq("routine_id", id)
    .order("day_order");

  const days: RoutineDayWithExercises[] = (daysRaw ?? []).map((d) => ({
    ...d,
    exercises: [...(d.routine_exercises ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  }));

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Terug naar schema&apos;s
        </Link>
        <div className="mb-6 mt-2">
          <h1 className="text-3xl font-bold">{routine.name}</h1>
          {routine.description && (
            <p className="mt-1 text-slate-400">{routine.description}</p>
          )}
        </div>

        {days.length > 0 && (
          <p className="mb-3 text-xs text-slate-500">
            Tip: sleep met het ⠿-handvat om dagen en oefeningen te herordenen.
          </p>
        )}
        <RoutineDays days={days} routineId={routine.id} />

        <AddDayForm routineId={routine.id} />
      </main>
    </>
  );
}
