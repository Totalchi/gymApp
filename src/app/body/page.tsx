import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { addBodyMetric, deleteBodyMetric } from "@/app/body/actions";
import {
  uploadProgressPhoto,
  deleteProgressPhoto,
  togglePhotoShared,
} from "@/app/body/photoActions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { getT } from "@/lib/serverLang";
import type { BodyMetric } from "@/lib/types";

type Photo = {
  id: string;
  url: string;
  path: string;
  taken_on: string;
  shared_with_coach: boolean;
};

export default async function BodyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t, lang } = await getT();
  const loc = lang === "en" ? "en-US" : "nl-NL";

  const [{ data }, { data: photoData }] = await Promise.all([
    supabase.from("body_metrics").select("*").order("measured_at", { ascending: false }),
    supabase
      .from("progress_photos")
      .select("id, url, path, taken_on, shared_with_coach")
      .order("taken_on", { ascending: false }),
  ]);
  const metrics = (data ?? []) as BodyMetric[];
  const photos = (photoData ?? []) as Photo[];

  const weightChart: ChartPoint[] = [...metrics]
    .filter((m) => m.weight != null)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    .map((m) => ({
      label: new Date(m.measured_at).toLocaleDateString(loc, {
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
                    {new Date(m.measured_at).toLocaleDateString(loc, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {[
                      m.weight != null && `${m.weight} kg`,
                      m.body_fat != null && `${m.body_fat}% ${t("body.sFat")}`,
                      m.chest != null && `${t("body.sChest")} ${m.chest}`,
                      m.waist != null && `${t("body.sWaist")} ${m.waist}`,
                      m.arms != null && `${t("body.sArms")} ${m.arms}`,
                      m.thighs != null && `${t("body.sThighs")} ${m.thighs}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <form action={deleteBodyMetric}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton
                    message={t("confirm.metric")}
                    confirmLabel={t("common.delete")}
                    cancelLabel={t("common.cancel")}
                    className="text-xs text-faint transition hover:text-danger"
                  >
                    {t("common.delete")}
                  </ConfirmButton>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Progressiefoto's */}
        <h2 className="mb-2 mt-8 font-semibold">{t("photos.title")}</h2>
        <form
          action={uploadProgressPhoto}
          className="mb-4 rounded-2xl border border-line bg-surface p-5"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{t("body.date")}</span>
              <input
                type="date"
                name="taken_on"
                defaultValue={today}
                className="rounded-lg border border-line bg-canvas px-2.5 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{t("photos.photo")}</span>
              <input
                type="file"
                name="photo"
                accept="image/*"
                required
                className="text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-fg"
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="shared_with_coach" className="h-4 w-4 accent-primary" />
            {t("photos.shareCoach")}
          </label>
          <button className="mt-3 block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110">
            {t("photos.upload")}
          </button>
        </form>

        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-faint">
            {t("photos.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="relative aspect-square bg-canvas">
                  <Image src={p.url} alt="" fill sizes="33vw" className="object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium">
                    {new Date(p.taken_on).toLocaleDateString(loc, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <form action={togglePhotoShared}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="shared" value={p.shared_with_coach ? "false" : "true"} />
                      <button
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.shared_with_coach
                            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                            : "bg-surface2 text-faint ring-1 ring-line"
                        }`}
                      >
                        {p.shared_with_coach ? `✓ ${t("photos.shared")}` : t("photos.private")}
                      </button>
                    </form>
                    <form action={deleteProgressPhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="path" value={p.path} />
                      <ConfirmButton
                        message={t("confirm.photo")}
                        confirmLabel={t("common.delete")}
                        cancelLabel={t("common.cancel")}
                        className="text-xs text-faint transition hover:text-danger"
                      >
                        {t("common.delete")}
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
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
