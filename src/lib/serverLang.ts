import { cookies } from "next/headers";
import { translate, DEFAULT_LANG, LANGS, type Lang } from "@/lib/i18n";
import type { WeightUnit } from "@/lib/units";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get("lang")?.value as Lang | undefined;
  return v && (LANGS as readonly string[]).includes(v) ? v : DEFAULT_LANG;
}

export async function getUnit(): Promise<WeightUnit> {
  const store = await cookies();
  return store.get("unit")?.value === "lb" ? "lb" : "kg";
}

/** Vertaal-helper voor server components. */
export async function getT(): Promise<{
  lang: Lang;
  t: (key: string) => string;
}> {
  const lang = await getLang();
  return { lang, t: (key: string) => translate(lang, key) };
}
