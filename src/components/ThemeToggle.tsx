"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/components/Icons";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Wissel thema"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface2 hover:text-fg"
    >
      {light ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}
    </button>
  );
}
