import Link from "next/link";
import { signout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconDumbbell } from "@/components/Icons";

const NAV = [
  { href: "/dashboard", label: "Schema's" },
  { href: "/exercises", label: "Oefeningen" },
  { href: "/templates", label: "Programma's" },
  { href: "/history", label: "Historie" },
  { href: "/stats", label: "Stats" },
  { href: "/progress", label: "Voortgang" },
  { href: "/body", label: "Lichaam" },
  { href: "/settings", label: "Instellingen" },
];

export function Header({ email: _email }: { email?: string | null }) {
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
          {NAV.map((n) => (
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
              Uitloggen
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
