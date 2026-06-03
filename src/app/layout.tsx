import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { UnitProvider } from "@/components/UnitProvider";
import { BottomNav } from "@/components/BottomNav";
import type { WeightUnit } from "@/lib/units";

export const metadata: Metadata = {
  title: "GymApp — Bouw je trainingsschema",
  description:
    "Maak eenvoudig wekelijkse trainingsschema's met push/pull/legs-dagen, sets, reps, kg en automatische RIR-berekening.",
};

export const viewport: Viewport = {
  themeColor: "#0a0c11",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Zet het thema vóór de eerste paint (voorkomt flikkering).
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <UnitProvider unit={unit}>
          {user ? (
            <>
              <div className="pb-20 md:pb-0">{children}</div>
              <BottomNav />
            </>
          ) : (
            children
          )}
        </UnitProvider>
      </body>
    </html>
  );
}
