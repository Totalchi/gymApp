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

  // Verberg de tab-bar tijdens een actieve workout (eigen onderbalk).
  if (pathname.startsWith("/workout/")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur md:hidden">
      <div
        className="mx-auto flex max-w-lg items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                active ? "text-primary" : "text-faint hover:text-fg"
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
