"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "@/app/login/actions";
import { useT } from "@/components/LangProvider";
import { IconDumbbell } from "@/components/Icons";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );
  const t = useT();

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-fg">
          <IconDumbbell className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">
          {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? t("auth.loginSub") : t("auth.registerSub")}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {mode === "register" && (
          <Field
            label={t("auth.name")}
            name="display_name"
            type="text"
            placeholder={t("auth.namePh")}
            autoComplete="name"
          />
        )}
        <Field
          label={t("auth.email")}
          name="email"
          type="email"
          placeholder="jij@voorbeeld.nl"
          autoComplete="email"
          required
        />
        <Field
          label={t("auth.password")}
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />

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
          className="w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-white shadow-lg  transition hover:opacity-90 disabled:opacity-50"
        >
          {pending
            ? t("auth.working")
            : mode === "login"
              ? t("auth.login")
              : t("auth.register")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t("auth.registerLink")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("auth.loginLink")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-fg placeholder:text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}
