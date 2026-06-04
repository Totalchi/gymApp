import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { UnitProvider } from "@/components/UnitProvider";
import { LangProvider } from "@/components/LangProvider";
import { BottomNav } from "@/components/BottomNav";
import { getLang, getUnit } from "@/lib/serverLang";

export const metadata: Metadata = {
  title: "GymApp",
  description:
    "Build weekly training routines with push/pull/legs days, sets, reps, weight and automatic RIR.",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "GymApp",
    statusBarStyle: "default",
  },
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
  // Snel: lees voorkeuren uit cookies (geen DB-round-trip per pagina).
  const [lang, unit] = await Promise.all([getLang(), getUnit()]);

  // Lichte auth-check (gecachet door Supabase) om navigatie te bepalen.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang={lang}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <LangProvider lang={lang}>
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
        </LangProvider>
      </body>
    </html>
  );
}
