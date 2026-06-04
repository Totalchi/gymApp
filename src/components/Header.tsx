"use client";

import Link from "next/link";
import { signout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { IconDumbbell } from "@/components/Icons";
import { useT } from "@/components/LangProvider";

export function Header({ email: _email }: { email?: string | null }) {
  const t = useT();
  const nav = [
    { href: "/dashboard", label: t("nav.routines") },
    { href: "/exercises", label: t("nav.exercises") },
    { href: "/feed", label: t("nav.feed") },
    { href: "/history", label: t("nav.history") },
    { href: "/stats", label: t("nav.stats") },
    { href: "/menu", label: t("nav.more") },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
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
          <NotificationBell />
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/menu"
            aria-label={t("nav.more")}
            title={t("nav.more")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </Link>
          <form action={signout}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
            >
              <span className="sm:hidden">⎋</span>
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
