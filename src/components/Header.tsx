import Link from "next/link";
import { signout } from "@/app/login/actions";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500">
            🏋️
          </span>
          GymApp
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/exercises"
            className="text-sm text-slate-300 hover:text-white"
          >
            Oefeningen
          </Link>
          {email && (
            <span className="hidden text-sm text-slate-500 sm:inline">
              {email}
            </span>
          )}
          <form action={signout}>
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Uitloggen
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
