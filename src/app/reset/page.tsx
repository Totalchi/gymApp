"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/app/login/actions";
import { useT } from "@/components/LangProvider";
import { IconDumbbell } from "@/components/Icons";

export default function ResetPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    {},
  );
  const t = useT();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-fg">
            <IconDumbbell className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.resetTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t("auth.resetSub")}</p>
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t("auth.newPassword")}
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-fg placeholder:text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {state.error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger ring-1 ring-danger/30">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t("auth.working") : t("auth.updatePassword")}
          </button>
        </form>
      </div>
    </main>
  );
}
