"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";

/**
 * Registreert de service worker en detecteert nieuwe deploys (via /api/version).
 * Bij een nieuwe versie verschijnt een onopdringerig balkje om te verversen —
 * geen automatische reload, zodat je nooit ingevulde sets verliest.
 */
export function AppUpdater() {
  const t = useT();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let current: string | null = null;
    async function check() {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const { v } = (await r.json()) as { v: string };
        if (!v) return;
        if (current === null) current = v;
        else if (v !== current) setUpdateReady(true);
      } catch {
        /* offline — negeren */
      }
    }

    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const iv = setInterval(check, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(iv);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
    >
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-lg ring-1 ring-black/10 transition hover:brightness-110"
      >
        🔄 {t("update.available")}
      </button>
    </div>
  );
}
