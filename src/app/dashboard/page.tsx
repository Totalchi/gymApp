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
import { startWorkout, startEmptyWorkout } from "@/app/workout/actions";
import { StartRoutineButton } from "@/components/StartRoutineButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS, type DayType } from "@/lib/types";

interface RoutineRow {
  id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  assigned_by: string | null;
  routine_days: { id: string; name: string; day_type: DayType; day_order: number }[];
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
    <div className="group relative flex flex-col card p-5 transition hover:-translate-y-0.5 hover:border-primary/40">
      <Link href={`/routines/${r.id}`} className="flex-1">
        {r.assigned_by && (
          <span className="mb-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/30">
            🧑‍🏫 {t("dash.fromCoach")}
          </span>
        )}
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

      <div className="mt-4">
        <StartRoutineButton routineId={r.id} days={r.routine_days} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
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
          <ConfirmButton
            message={t("confirm.routine")}
            confirmLabel={t("common.delete")}
            cancelLabel={t("common.cancel")}
            className="text-faint transition hover:text-danger"
          >
            {t("common.delete")}
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  // Vandaag op het programma (dagen gekoppeld aan de huidige weekdag).
  const todayIdx = (new Date().getDay() + 6) % 7; // 0 = maandag

  // Alle queries parallel (ze leunen op RLS, niet op user.id) — sneller.
  const [
    {
      data: { user },
    },
    { data: routines },
    { data: folders },
    { data: todayDays },
    { data: sessionDatesRaw },
    { data: profile },
    { data: totalsRows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("routines")
      .select("id, name, description, created_at, folder_id, assigned_by, routine_days(id, name, day_type, day_order)")
      .order("created_at", { ascending: false }),
    supabase
      .from("routine_folders")
      .select("id, name")
      .order("position")
      .order("name"),
    supabase
      .from("routine_days")
      .select("id, name, day_type, routine_id")
      .eq("weekday", todayIdx),
    // Alleen datums (licht) — voor streak + 'deze week'. Enkel afgeronde workouts.
    supabase
      .from("workout_sessions")
      .select("performed_at, user_id")
      .not("completed_at", "is", null),
    supabase.from("profiles").select("role, display_name").maybeSingle(),
    // Totalen server-side berekend (snel, weinig data).
    supabase.rpc("user_workout_totals"),
  ]);
  const isCoach = profile?.role === "coach";
  // Alleen je EIGEN sessies (RLS laat ook gedeelde workouts van gevolgden door).
  const sessionDates = (
    (sessionDatesRaw ?? []) as { performed_at: string; user_id: string }[]
  ).filter((s) => s.user_id === user?.id);

  let totalWorkouts = sessionDates.length;
  let totalSets = 0;
  let totalVolume = 0;
  const totals = (totalsRows as { workouts: number; sets: number; volume: number }[] | null)?.[0];
  if (totals) {
    totalWorkouts = Number(totals.workouts) || 0;
    totalSets = Number(totals.sets) || 0;
    totalVolume = Number(totals.volume) || 0;
  } else {
    // Fallback vóór migratie 0020: tel client-side.
    const { data: fb } = await supabase
      .from("workout_sessions")
      .select("workout_sets(weight, reps)");
    for (const s of fb ?? []) {
      for (const set of (s.workout_sets ?? []) as { weight: number | null; reps: number | null }[]) {
        totalVolume += (set.weight ?? 0) * (set.reps ?? 0);
        totalSets += 1;
      }
    }
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = sessionDates.filter(
    (s) => new Date(s.performed_at).getTime() >= weekAgo,
  ).length;

  const days = new Set(
    sessionDates.map((s) => new Date(s.performed_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cur = new Date();
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toISOString().slice(0, 10))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }

  const firstName = (profile?.display_name || "").trim().split(" ")[0] || "";
  const hour = new Date().getHours();
  const greetKey = hour < 6 ? "greet.night" : hour < 12 ? "greet.morning" : hour < 18 ? "greet.afternoon" : "greet.evening";

  const stats = [
    { label: t("dash.workouts"), value: totalWorkouts, href: "/history", icon: "🏋️", tint: "text-blue-300", ring: "ring-blue-500/25", bg: "bg-blue-500/10" },
    { label: t("dash.thisWeek"), value: thisWeek, href: "/history", icon: "📅", tint: "text-sky-300", ring: "ring-sky-500/25", bg: "bg-sky-500/10" },
    { label: t("dash.streak"), value: streak, href: "/achievements", icon: "🔥", tint: "text-amber-300", ring: "ring-amber-500/25", bg: "bg-amber-500/10" },
    { label: t("dash.setsLogged"), value: totalSets, href: "/history", icon: "✅", tint: "text-emerald-300", ring: "ring-emerald-500/25", bg: "bg-emerald-500/10" },
    { label: t("dash.totalVolume"), value: `${Math.round(totalVolume).toLocaleString()} kg`, href: "/stats", icon: "📊", tint: "text-violet-300", ring: "ring-violet-500/25", bg: "bg-violet-500/10" },
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
          <p className="text-sm font-medium text-faint">
            {new Date().toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight">
            {t(greetKey)}{firstName ? `, ${firstName}` : ""} 👋
          </h1>
        </div>

        {/* Snelle start zonder schema (Hevy-stijl) */}
        <form action={startEmptyWorkout} className="mb-8">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3.5 font-semibold text-white shadow-[var(--shadow)] transition hover:opacity-90 active:scale-[0.99]"
          >
            ⚡ {t("dash.startEmpty")}
          </button>
        </form>

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
                    className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4 shadow-[var(--shadow)]"
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

        {totalWorkouts > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="card group flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ring-1 ${s.bg} ${s.ring}`}
              >
                {s.icon}
              </span>
              <div>
                <p className={`text-2xl font-bold tabular-nums ${s.tint}`}>{s.value}</p>
                <p className="mt-0.5 text-xs text-faint">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
        )}

        {/* Nieuw schema (inklapbaar zodat het dashboard rustig blijft) */}
        <details className="group mb-6 overflow-hidden card-flat">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
            <span>➕ {t("dash.newSchema")}</span>
            <span className="text-faint transition group-open:rotate-180">⌄</span>
          </summary>
          <form action={createRoutine} className="flex flex-col gap-3 px-5 pb-5 sm:flex-row">
            <input
              name="name"
              required
              placeholder={t("dash.namePh")}
              className="flex-1 input"
            />
            <input
              name="description"
              placeholder={t("dash.descPh")}
              className="flex-1 input"
            />
            <button
              type="submit"
              className="btn-primary"
            >
              {t("dash.create")}
            </button>
          </form>
        </details>

        {all.length === 0 ? (
          <div className="card-flat p-6 text-center">
            <div className="text-4xl">👋</div>
            <h2 className="mt-2 text-xl font-bold">{t("onb.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("onb.sub")}</p>
            <div className="mt-4 grid gap-3 text-left sm:grid-cols-3">
              {[t("onb.step1"), t("onb.step2"), t("onb.step3")].map((step, i) => (
                <div key={i} className="rounded-xl border border-line bg-canvas p-3">
                  <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">
                    {i + 1}
                  </div>
                  <p className="text-sm text-muted">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Link
                href="/templates"
                className="inline-block btn-primary px-6 py-3"
              >
                {t("onb.useTemplate")}
              </Link>
              <p className="mt-2 text-xs text-faint">{t("onb.or")}</p>
            </div>
            {isCoach && (
              <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4 text-left">
                <p className="text-sm font-medium">🧑‍🏫 {t("onb.coachTitle")}</p>
                <p className="mt-1 text-xs text-muted">{t("onb.coachSub")}</p>
                <Link
                  href="/coach"
                  className="mt-3 inline-block btn-primary rounded-lg px-4 py-2 text-sm"
                >
                  {t("onb.coachCta")}
                </Link>
              </div>
            )}
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
              <details className="group mt-6 card-flat">
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
                      className="flex-1 input py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2 text-sm"
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
                      <ConfirmButton
                        message={t("confirm.folder")}
                        confirmLabel={t("common.delete")}
                        cancelLabel={t("common.cancel")}
                        className="text-xs text-faint transition hover:text-danger"
                      >
                        {t("dash.deleteFolder")}
                      </ConfirmButton>
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

            <details className="group card-flat">
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
                    className="flex-1 input py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2 text-sm"
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
