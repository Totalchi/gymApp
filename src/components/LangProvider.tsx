"use client";

import { createContext, useContext } from "react";
import { translate, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("nl");

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** Vertaal-hook voor client components. */
export function useT(): (key: string) => string {
  const lang = useContext(LangContext);
  return (key: string) => translate(lang, key);
}
