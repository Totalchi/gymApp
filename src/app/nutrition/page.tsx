import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { getT } from "@/lib/serverLang";
import { saveNutrition, setNutritionGoals } from "@/app/nutrition/actions";

type Row = {
  log_date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

function Bar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface2">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default async function NutritionPage() {
  const supabase = await createClient();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [
    {
      data: { user },
    },
    { data: rows },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("nutrition_logs")
      .select("log_date, calories, protein, carbs, fat")
      .gte("log_date", weekAgo)
      .order("log_date", { ascending: false }),
    supabase.from("profiles").select("calorie_goal, protein_goal").maybeSingle(),
  ]);

  const all = (rows ?? []) as Row[];
  const todayRow = all.find((r) => r.log_date === today);
  const calGoal = profile?.calorie_goal ?? 0;
  const protGoal = profile?.protein_goal ?? 0;

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("nutri.title")}</h1>
        <p className="mb-6 text-muted">{t("nutri.subtitle")}</p>

        {/* Dagoverzicht met doelen */}
        <section className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-semibold">{t("nutri.today")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-faint">{t("nutri.calories")}</p>
              <p className="text-2xl font-bold tabular-nums">
                {todayRow?.calories ?? 0}
                {calGoal > 0 && <span className="text-sm font-normal text-faint"> / {calGoal}</span>}
              </p>
              {calGoal > 0 && <Bar value={todayRow?.calories ?? 0} goal={calGoal} color="#6366f1" />}
            </div>
            <div>
              <p className="text-sm text-faint">{t("nutri.protein")} (g)</p>
              <p className="text-2xl font-bold tabular-nums">
                {todayRow?.protein ?? 0}
                {protGoal > 0 && <span className="text-sm font-normal text-faint"> / {protGoal}</span>}
              </p>
              {protGoal > 0 && <Bar value={todayRow?.protein ?? 0} goal={protGoal} color="#10b981" />}
            </div>
          </div>
        </section>

        {/* Vandaag invullen */}
        <form action={saveNutrition} className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-semibold">{t("nutri.logToday")}</h2>
          <input type="hidden" name="log_date" value={today} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["calories", t("nutri.calories"), todayRow?.calories],
                ["protein", t("nutri.protein"), todayRow?.protein],
                ["carbs", t("nutri.carbs"), todayRow?.carbs],
                ["fat", t("nutri.fat"), todayRow?.fat],
              ] as const
            ).map(([name, label, val]) => (
              <label key={name} className="flex flex-col">
                <span className="mb-1 text-xs font-medium text-faint">{label}</span>
                <input
                  name={name}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  defaultValue={val ?? ""}
                  className="h-11 rounded-lg border border-line bg-canvas px-2 text-center text-base tabular-nums focus:border-primary focus:outline-none"
                />
              </label>
            ))}
          </div>
          <button className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110">
            {t("common.save")}
          </button>
        </form>

        {/* Doelen instellen */}
        <details className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <summary className="cursor-pointer font-semibold">{t("nutri.goals")}</summary>
          <form action={setNutritionGoals} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col">
              <span className="mb-1 text-xs font-medium text-faint">{t("nutri.calorieGoal")}</span>
              <input
                name="calorie_goal"
                type="number"
                inputMode="numeric"
                min="0"
                defaultValue={profile?.calorie_goal ?? ""}
                className="h-11 w-28 rounded-lg border border-line bg-canvas px-2 text-center tabular-nums focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-xs font-medium text-faint">{t("nutri.proteinGoal")}</span>
              <input
                name="protein_goal"
                type="number"
                inputMode="numeric"
                min="0"
                defaultValue={profile?.protein_goal ?? ""}
                className="h-11 w-28 rounded-lg border border-line bg-canvas px-2 text-center tabular-nums focus:border-primary focus:outline-none"
              />
            </label>
            <button className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-fg transition hover:brightness-110">
              {t("common.save")}
            </button>
          </form>
        </details>

        {/* Laatste 7 dagen */}
        <h2 className="mb-2 font-semibold">{t("nutri.last7")}</h2>
        {all.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-faint">
            {t("nutri.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {all.map((r) => (
              <div
                key={r.log_date}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
              >
                <span className="text-sm font-medium">
                  {new Date(r.log_date).toLocaleDateString(loc, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-sm text-muted tabular-nums">
                  {r.calories ?? 0} kcal · {r.protein ?? 0}g {t("nutri.proteinShort")}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
