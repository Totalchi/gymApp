"use client";

import Link from "next/link";
import { useT } from "@/components/LangProvider";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="mt-3 text-xl font-bold">{t("err.title")}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">{t("err.sub")}</p>
      <div className="mt-5 flex gap-2">
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-fg transition hover:brightness-110"
        >
          {t("err.retry")}
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-line px-5 py-2.5 font-medium transition hover:bg-surface2"
        >
          {t("err.home")}
        </Link>
      </div>
    </main>
  );
}
