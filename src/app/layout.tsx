import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { UnitProvider } from "@/components/UnitProvider";
import type { WeightUnit } from "@/lib/units";

export const metadata: Metadata = {
  title: "GymApp — Bouw je trainingsschema",
  description:
    "Maak eenvoudig wekelijkse trainingsschema's met push/pull/legs-dagen, sets, reps, kg en automatische RIR-berekening.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let unit: WeightUnit = "kg";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("weight_unit")
      .eq("id", user.id)
      .single();
    if (data?.weight_unit === "lb") unit = "lb";
  }

  return (
    <html lang="nl">
      <body className="min-h-screen">
        <UnitProvider unit={unit}>{children}</UnitProvider>
      </body>
    </html>
  );
}
