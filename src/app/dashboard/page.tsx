import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import {
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  createFolder,
  deleteFolder,
  setRoutineFolder,
} from "@/app/routines/actions";
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS, type DayType } from "@/lib/types";

interface RoutineRow {
  id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  routine_days: { day_type: DayType }[];
}

function RoutineCard({
  r,
  folders,
}: {
  r: RoutineRow;
  folders: { id: string; name: string }[];
}) {
  const dayTypes = [...new Set(r.routine_days.map((d) => d.day_type))];
  return (
    <div className="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-line">
      <Link href={`/routines/${r.id}`} className="flex-1">
        <h3 className="text-lg font-semibold group-hover:text-primary">{r.name}</h3>
        {r.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dayTypes.length === 0 ? (
            <span className="text-xs text-faint">Nog geen dagen</span>
          ) : (
            dayTypes.map((t) => (
              <span
                key={t}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[t]}`}
              >
                {DAY_TYPE_LABELS[t]}
              </span>
            ))
          )}
        </div>
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
        <form action={duplicateRoutine}>
          <input type="hidden" name="id" value={r.id} />
          <button type="submit" className="text-muted transition hover:text-primary">
            Dupliceren
          </button>
        </form>
        {folders.length > 0 && (
          <form action={setRoutineFolder} className="flex items-center gap-1">
            <input type="hidden" name="routine_id" value={r.id} />
            <select
              name="folder_id"
              defaultValue={r.folder_id ?? ""}
              className="rounded-md border border-line bg-canvas px-1.5 py-1 text-xs text-muted focus:outline-none"
            >
              <option value="">Geen map</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button type="submit" className="text-muted transition hover:text-primary">
              ↦
            </button>
          </form>
        )}
        <form action={deleteRoutine} className="ml-auto">
          <input type="hidden" name="id" value={r.id} />
          <button type="submit" className="text-faint transition hover:text-primary">
            Verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, description, created_at, folder_id, routine_days(day_type)")
    .order("created_at", { ascending: false });

  const { data: folders } = await supabase
    .from("routine_folders")
    .select("id, name")
    .order("position")
    .order("name");

  // Stats.
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("performed_at, workout_sets(weight, reps)");
  const allSessions = sessions ?? [];
  const totalWorkouts = allSessions.length;
  let totalVolume = 0;
  let totalSets = 0;
  for (const s of allSessions) {
    for (const set of (s.workout_sets ?? []) as { weight: number | null; reps: number | null }[]) {
      totalVolume += (set.weight ?? 0) * (set.reps ?? 0);
      totalSets += 1;
    }
  }
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = allSessions.filter(
    (s) => new Date(s.performed_at).getTime() >= weekAgo,
  ).length;

  // Streak: opeenvolgende dagen met een workout (incl. vandaag/gisteren).
  const days = new Set(
    allSessions.map((s) => new Date(s.performed_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cur = new Date();
  // Sta toe dat de streak gisteren eindigt (vandaag nog niet getraind).
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toISOString().slice(0, 10))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }

  const stats = [
    { label: "Workouts", value: totalWorkouts },
    { label: "Deze week", value: thisWeek },
    { label: "Dag-streak", value: `${streak}🔥` },
    { label: "Sets gelogd", value: totalSets },
    { label: "Totaal volume", value: `${Math.round(totalVolume).toLocaleString("nl-NL")} kg` },
  ];

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mijn schema&apos;s</h1>
          <p className="mt-1 text-muted">
            Bouw wekelijkse trainingsschema&apos;s met push/pull/legs-dagen,
            sets, reps, kg en automatische RIR.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-line bg-surface p-4 text-center"
            >
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-xs text-faint">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Nieuw schema */}
        <form
          action={createRoutine}
          className="mb-8 rounded-2xl border border-line bg-surface p-5"
        >
          <h2 className="mb-3 font-semibold">Nieuw schema</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="name"
              required
              placeholder="Bijv. Push / Pull / Legs"
              className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
            />
            <input
              name="description"
              placeholder="Korte omschrijving (optioneel)"
              className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white transition hover:opacity-90"
            >
              Aanmaken
            </button>
          </div>
        </form>

        {/* Map aanmaken */}
        <form action={createFolder} className="mb-6 flex gap-2">
          <input
            name="name"
            placeholder="Nieuwe map (bijv. 'Bulk 2026')"
            className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2 text-sm placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border border-line px-4 py-2 text-sm text-fg transition hover:border-primary hover:text-primary"
          >
            + Map
          </button>
        </form>

        {/* Lijst */}
        {!routines || routines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-faint">
            Nog geen schema&apos;s. Maak je eerste schema hierboven aan! 💪
          </div>
        ) : (
          (() => {
            const all = (routines as RoutineRow[]) ?? [];
            const folderList = folders ?? [];
            const sections = [
              ...folderList.map((f) => ({
                id: f.id,
                name: f.name,
                items: all.filter((r) => r.folder_id === f.id),
                deletable: true,
              })),
              {
                id: null as string | null,
                name: "Zonder map",
                items: all.filter((r) => !r.folder_id),
                deletable: false,
              },
            ].filter((s) => s.items.length > 0 || s.deletable);

            return (
              <div className="space-y-8">
                {sections.map((section) => (
                  <div key={section.id ?? "none"}>
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="font-semibold text-muted">
                        {section.id ? "📁 " : ""}
                        {section.name}
                      </h2>
                      <span className="text-xs text-faint">
                        {section.items.length}
                      </span>
                      {section.deletable && (
                        <form action={deleteFolder} className="ml-auto">
                          <input type="hidden" name="id" value={section.id!} />
                          <button
                            type="submit"
                            className="text-xs text-faint transition hover:text-primary"
                          >
                            Map verwijderen
                          </button>
                        </form>
                      )}
                    </div>
                    {section.items.length === 0 ? (
                      <p className="text-sm text-faint">Leeg.</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {section.items.map((r) => (
                          <RoutineCard key={r.id} r={r} folders={folderList} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </main>
    </>
  );
}
