import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UnitProvider } from "@/components/UnitProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
import { LangProvider } from "@/components/LangProvider";
import { BottomNav } from "@/components/BottomNav";
import { AppUpdater } from "@/components/AppUpdater";
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
  // Snel: lees voorkeuren uit cookies (geen DB-/auth-round-trip per pagina).
  // De BottomNav verbergt zichzelf op publieke routes, dus we hoeven hier
  // geen auth-call te doen (scheelt een netwerk-round-trip per navigatie).
  const [lang, unit] = await Promise.all([getLang(), getUnit()]);

  return (
    <html lang={lang} className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <LangProvider lang={lang}>
          <UnitProvider unit={unit}>
            <div className="pb-20 md:pb-0">{children}</div>
            <BottomNav />
            <AppUpdater />
          </UnitProvider>
        </LangProvider>
      </body>
    </html>
  );
}
