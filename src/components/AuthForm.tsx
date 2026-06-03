"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "@/app/login/actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">
          🏋️
        </div>
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Welkom terug" : "Account aanmaken"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Log in om je schema's te bekijken."
            : "Maak een account om je schema's op te slaan."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {mode === "register" && (
          <Field
            label="Naam"
            name="display_name"
            type="text"
            placeholder="Je naam"
            autoComplete="name"
          />
        )}
        <Field
          label="E-mailadres"
          name="email"
          type="email"
          placeholder="jij@voorbeeld.nl"
          autoComplete="email"
          required
        />
        <Field
          label="Wachtwoord"
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
            ? "Bezig..."
            : mode === "login"
              ? "Inloggen"
              : "Account aanmaken"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            Nog geen account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Registreren
            </Link>
          </>
        ) : (
          <>
            Heb je al een account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inloggen
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
