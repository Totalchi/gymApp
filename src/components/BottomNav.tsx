"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconDumbbell,
  IconChart,
  IconClock,
  IconCog,
} from "@/components/Icons";

const TABS = [
  { href: "/dashboard", label: "Schema's", Icon: IconHome },
  { href: "/exercises", label: "Oefeningen", Icon: IconDumbbell },
  { href: "/stats", label: "Stats", Icon: IconChart },
  { href: "/history", label: "Historie", Icon: IconClock },
  { href: "/settings", label: "Meer", Icon: IconCog },
];

export function BottomNav() {
  const pathname = usePathname();

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
