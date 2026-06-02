import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { DayCard } from "@/components/DayCard";
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

        <div className="space-y-5">
          {days.map((day) => (
            <DayCard key={day.id} day={day} routineId={routine.id} />
          ))}
        </div>

        <AddDayForm routineId={routine.id} />
      </main>
    </>
  );
}
