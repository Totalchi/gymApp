import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { addBodyMetric, deleteBodyMetric } from "@/app/body/actions";
import { getT } from "@/lib/serverLang";
import type { BodyMetric } from "@/lib/types";

export default async function BodyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getT();

  const { data } = await supabase
    .from("body_metrics")
    .select("*")
    .order("measured_at", { ascending: false });
  const metrics = (data ?? []) as BodyMetric[];

  const weightChart: ChartPoint[] = [...metrics]
    .filter((m) => m.weight != null)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    .map((m) => ({
      label: new Date(m.measured_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      }),
      value: m.weight!,
    }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("body.title")}</h1>
        <p className="mb-6 text-muted">{t("body.subtitle")}</p>

        {weightChart.length >= 2 && (
          <section className="mb-6 rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-2 font-semibold">{t("body.weightChart")} (kg)</h2>
            <LineChart points={weightChart} unit="" color="#34d399" />
          </section>
        )}

        {/* Nieuwe meting */}
        <form
          action={addBodyMetric}
          className="mb-6 rounded-2xl border border-line bg-surface p-5"
        >
          <h2 className="mb-3 font-semibold">{t("body.newMeasurement")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label={t("body.date")} name="measured_at" type="date" defaultValue={today} />
            <Field label={`${t("body.weight")} (kg)`} name="weight" type="number" step="0.1" />
            <Field label={t("body.bodyfat")} name="body_fat" type="number" step="0.1" />
            <Field label={t("body.chest")} name="chest" type="number" step="0.1" />
            <Field label={t("body.waist")} name="waist" type="number" step="0.1" />
            <Field label={t("body.arms")} name="arms" type="number" step="0.1" />
            <Field label={t("body.thighs")} name="thighs" type="number" step="0.1" />
          </div>
          <button
            type="submit"
            className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110"
          >
            {t("common.save")}
          </button>
        </form>

        {/* Lijst */}
        <h2 className="mb-2 font-semibold">{t("body.measurements")}</h2>
        {metrics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-12 text-center text-faint">
            {t("body.empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {metrics.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {new Date(m.measured_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {[
                      m.weight != null && `${m.weight} kg`,
                      m.body_fat != null && `${m.body_fat}% vet`,
                      m.chest != null && `borst ${m.chest}`,
                      m.waist != null && `taille ${m.waist}`,
                      m.arms != null && `armen ${m.arms}`,
                      m.thighs != null && `benen ${m.thighs}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <form action={deleteBodyMetric}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="text-xs text-faint transition hover:text-danger"
                  >
                    {t("common.delete")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-line bg-canvas px-2.5 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}
