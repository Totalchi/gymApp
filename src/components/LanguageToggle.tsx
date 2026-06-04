"use client";

import { useLang } from "@/components/LangProvider";

export function LanguageToggle() {
  const lang = useLang();

  function setLang(next: "nl" | "en") {
    document.cookie = `lang=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "nl" ? "en" : "nl")}
      aria-label="Taal / Language"
      title={lang === "nl" ? "Schakel naar Engels" : "Switch to Dutch"}
      className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-line px-2 text-xs font-bold text-muted transition hover:bg-surface2 hover:text-fg"
    >
      {lang.toUpperCase()}
    </button>
  );
}
