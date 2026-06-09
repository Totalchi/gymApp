"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconDumbbell,
  IconUsers,
  IconClock,
  IconList,
} from "@/components/Icons";
import { useT } from "@/components/LangProvider";

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const TABS = [
    { href: "/dashboard", label: t("nav.routines"), Icon: IconHome },
    { href: "/exercises", label: t("nav.exercises"), Icon: IconDumbbell },
    { href: "/feed", label: t("nav.feed"), Icon: IconUsers },
    { href: "/history", label: t("nav.history"), Icon: IconClock },
    { href: "/menu", label: t("nav.more"), Icon: IconList },
  ];

  // Verberg de tab-bar op publieke routes en tijdens een actieve workout.
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/workout/")
  ) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-xl md:hidden">
      <div
        className="mx-auto flex max-w-lg items-stretch justify-around px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2 text-[10px] font-medium transition ${
                active ? "text-primary" : "text-faint hover:text-fg"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                  active ? "bg-primary/15" : ""
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
