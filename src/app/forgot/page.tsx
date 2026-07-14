"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/app/login/actions";
import { useT } from "@/components/LangProvider";
import { AuthTopBar } from "@/components/AuthTopBar";
import { IconDumbbell } from "@/components/Icons";

export default function ForgotPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    {},
  );
  const t = useT();

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <AuthTopBar />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-fg">
            <IconDumbbell className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.forgotTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t("auth.forgotSub")}</p>
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">{t("auth.email")}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="jij@voorbeeld.nl"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-fg placeholder:text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {state.error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger ring-1 ring-danger/30">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 ring-1 ring-emerald-500/30">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full btn-primary"
          >
            {pending ? t("auth.working") : t("auth.sendReset")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.loginLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
