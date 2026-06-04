import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import {
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  createFolder,
  deleteFolder,
  setRoutineFolder,
} from "@/app/routines/actions";
import { startWorkout } from "@/app/workout/actions";
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
  t,
}: {
  r: RoutineRow;
  folders: { id: string; name: string }[];
  t: (k: string) => string;
}) {
  const dayTypes = [...new Set(r.routine_days.map((d) => d.day_type))];
  return (
    <div className="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-primary/40">
      <Link href={`/routines/${r.id}`} className="flex-1">
        <h3 className="text-lg font-semibold group-hover:text-primary">{r.name}</h3>
        {r.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dayTypes.length === 0 ? (
            <span className="text-xs text-faint">{t("dash.noDays")}</span>
          ) : (
            dayTypes.map((d) => (
              <span
                key={d}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[d]}`}
              >
                {DAY_TYPE_LABELS[d]}
              </span>
            ))
          )}
        </div>
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
        <form action={duplicateRoutine}>
          <input type="hidden" name="id" value={r.id} />
          <button type="submit" className="text-muted transition hover:text-primary">
            {t("dash.duplicate")}
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
              <option value="">{t("dash.withoutFolder")}</option>
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
          <button type="submit" className="text-faint transition hover:text-danger">
            {t("common.delete")}
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
  const { t } = await getT();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, description, created_at, folder_id, routine_days(day_type)")
    .order("created_at", { ascending: false });

  const { data: folders } = await supabase
    .from("routine_folders")
    .select("id, name")
    .order("position")
    .order("name");

  // Vandaag op het programma (dagen gekoppeld aan de huidige weekdag).
  const todayIdx = (new Date().getDay() + 6) % 7; // 0 = maandag
  const { data: todayDays } = await supabase
    .from("routine_days")
    .select("id, name, day_type, routine_id")
    .eq("weekday", todayIdx);

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

  const days = new Set(
    allSessions.map((s) => new Date(s.performed_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cur = new Date();
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toISOString().slice(0, 10))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }

  const stats = [
    { label: t("dash.workouts"), value: totalWorkouts, href: "/history" },
    { label: t("dash.thisWeek"), value: thisWeek, href: "/history" },
    { label: t("dash.streak"), value: `${streak}🔥`, href: "/achievements" },
    { label: t("dash.setsLogged"), value: totalSets, href: "/history" },
    { label: t("dash.totalVolume"), value: `${Math.round(totalVolume).toLocaleString()} kg`, href: "/stats" },
  ];

  const all = (routines as RoutineRow[]) ?? [];
  const folderList = folders ?? [];
  const sections = [
    ...folderList.map((f) => ({
      id: f.id as string | null,
      name: f.name,
      items: all.filter((r) => r.folder_id === f.id),
      deletable: true,
    })),
    {
      id: null as string | null,
      name: t("dash.withoutFolder"),
      items: all.filter((r) => !r.folder_id),
      deletable: false,
    },
  ].filter((s) => s.items.length > 0 || s.deletable);

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("dash.title")}</h1>
          <p className="mt-1 text-muted">{t("dash.subtitle")}</p>
        </div>

        {/* Vandaag op het programma */}
        {todayDays && todayDays.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
              {t("plan.today")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(todayDays as { id: string; name: string; day_type: DayType; routine_id: string }[]).map(
                (d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4"
                  >
                    <div className="min-w-0">
                      <span
                        className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DAY_TYPE_COLORS[d.day_type]}`}
                      >
                        {DAY_TYPE_LABELS[d.day_type]}
                      </span>
                      <p className="truncate font-semibold">{d.name}</p>
                    </div>
                    <form action={startWorkout}>
                      <input type="hidden" name="routine_id" value={d.routine_id} />
                      <input type="hidden" name="day_id" value={d.id} />
                      <input type="hidden" name="day_name" value={d.name} />
                      <button
                        type="submit"
                        className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        ▶ {t("routine.start")}
                      </button>
                    </form>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-primary/50"
            >
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-xs text-faint">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Nieuw schema (inklapbaar zodat het dashboard rustig blijft) */}
        <details className="group mb-6 overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
            <span>➕ {t("dash.newSchema")}</span>
            <span className="text-faint transition group-open:rotate-180">⌄</span>
          </summary>
          <form action={createRoutine} className="flex flex-col gap-3 px-5 pb-5 sm:flex-row">
            <input
              name="name"
              required
              placeholder={t("dash.namePh")}
              className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
            />
            <input
              name="description"
              placeholder={t("dash.descPh")}
              className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110"
            >
              {t("dash.create")}
            </button>
          </form>
        </details>

        {all.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center text-faint">
            {t("dash.empty")}
          </div>
        ) : folderList.length === 0 ? (
          /* Geen mappen: gewoon een nette lijst */
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {all.map((r) => (
                <RoutineCard key={r.id} r={r} folders={folderList} t={t} />
              ))}
            </div>
            {all.length >= 2 && (
              <details className="group mt-6 rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted">
                  <span>🗂 {t("dash.addFolder")}</span>
                  <span className="text-faint transition group-open:rotate-180">⌄</span>
                </summary>
                <div className="px-4 pb-4">
                  <p className="mb-2 text-xs text-faint">{t("dash.foldersHint")}</p>
                  <form action={createFolder} className="flex gap-2">
                    <input
                      name="name"
                      required
                      placeholder={t("dash.folderPh")}
                      className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2 text-sm placeholder:text-faint focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition hover:brightness-110"
                    >
                      {t("dash.addFolder")}
                    </button>
                  </form>
                </div>
              </details>
            )}
          </>
        ) : (
          /* Met mappen: groepeer netjes */
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.id ?? "none"}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="font-semibold text-muted">
                    {section.id ? "📁 " : ""}
                    {section.name}
                  </h2>
                  <span className="text-xs text-faint">{section.items.length}</span>
                  {section.deletable && (
                    <form action={deleteFolder} className="ml-auto">
                      <input type="hidden" name="id" value={section.id!} />
                      <button
                        type="submit"
                        className="text-xs text-faint transition hover:text-danger"
                      >
                        {t("dash.deleteFolder")}
                      </button>
                    </form>
                  )}
                </div>
                {section.items.length === 0 ? (
                  <p className="text-sm text-faint">{t("dash.folderEmpty")}</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((r) => (
                      <RoutineCard key={r.id} r={r} folders={folderList} t={t} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            <details className="group rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted">
                <span>🗂 {t("dash.addFolder")}</span>
                <span className="text-faint transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="px-4 pb-4">
                <form action={createFolder} className="flex gap-2">
                  <input
                    name="name"
                    required
                    placeholder={t("dash.folderPh")}
                    className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2 text-sm placeholder:text-faint focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition hover:brightness-110"
                  >
                    {t("dash.addFolder")}
                  </button>
                </form>
              </div>
            </details>
          </div>
        )}
      </main>
    </>
  );
}
