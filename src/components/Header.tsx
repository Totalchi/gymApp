"use client";

import Link from "next/link";
import { signout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconDumbbell } from "@/components/Icons";
import { useT } from "@/components/LangProvider";

export function Header({ email: _email }: { email?: string | null }) {
  const t = useT();
  const nav = [
    { href: "/dashboard", label: t("nav.routines") },
    { href: "/exercises", label: t("nav.exercises") },
    { href: "/templates", label: t("nav.programs") },
    { href: "/history", label: t("nav.history") },
    { href: "/stats", label: t("nav.stats") },
    { href: "/progress", label: t("nav.progress") },
    { href: "/body", label: t("nav.body") },
    { href: "/settings", label: t("nav.settings") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
            <IconDumbbell className="h-5 w-5" />
          </span>
          <span>GymApp</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signout}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
            >
              {t("nav.logout")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
