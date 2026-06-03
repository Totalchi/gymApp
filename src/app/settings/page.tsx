import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { updateProfile } from "@/app/settings/actions";

const MORE_LINKS = [
  { href: "/templates", label: "Programma's", desc: "Kant-en-klare schema's" },
  { href: "/progress", label: "Voortgang", desc: "1RM-grafieken per oefening" },
  { href: "/body", label: "Lichaam", desc: "Gewicht & maten bijhouden" },
  { href: "/stats", label: "Statistieken", desc: "Kalender, volume, export" },
];

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
          className="space-y-5 rounded-2xl border border-line bg-surface p-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              Naam
            </span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              placeholder="Je naam"
              className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 focus:border-primary focus:outline-none"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-muted">
              Gewichtseenheid
            </span>
            <div className="flex gap-2">
              {(["kg", "lb"] as const).map((u) => (
                <label
                  key={u}
                  className="flex-1 cursor-pointer rounded-xl border border-line bg-canvas px-4 py-2.5 text-center font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
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
            <p className="mt-1.5 text-xs text-faint">
              Bepaalt het label bij gewichten in de hele app.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110"
          >
            Opslaan
          </button>
        </form>

        {/* Meer (vooral handig op mobiel) */}
        <h2 className="mb-2 mt-8 font-semibold">Meer</h2>
        <div className="grid grid-cols-2 gap-3">
          {MORE_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
            >
              <p className="font-medium">{l.label}</p>
              <p className="mt-0.5 text-xs text-faint">{l.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
