import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { updateProfile } from "@/app/settings/actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, weight_unit")
    .eq("id", user?.id ?? "")
    .single();

  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";

  return (
    <>
      <Header email={user?.email} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Instellingen</h1>

        <form
          action={updateProfile}
          className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              Naam
            </span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              placeholder="Je naam"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 focus:border-rose-500 focus:outline-none"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              Gewichtseenheid
            </span>
            <div className="flex gap-2">
              {(["kg", "lb"] as const).map((u) => (
                <label
                  key={u}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-center font-medium has-[:checked]:border-rose-500 has-[:checked]:bg-rose-500/10 has-[:checked]:text-rose-300"
                >
                  <input
                    type="radio"
                    name="weight_unit"
                    value={u}
                    defaultChecked={unit === u}
                    className="sr-only"
                  />
                  {u.toUpperCase()}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Bepaalt het label bij gewichten in de hele app.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90"
          >
            Opslaan
          </button>
        </form>
      </main>
    </>
  );
}
