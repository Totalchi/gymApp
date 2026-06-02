import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymApp — Bouw je trainingsschema",
  description:
    "Maak eenvoudig wekelijkse trainingsschema's met push/pull/legs-dagen, sets, reps, kg en automatische RIR-berekening.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
