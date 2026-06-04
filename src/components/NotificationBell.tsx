"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const t = useT();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    (async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (active) setCount(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={t("notif.bell")}
      title={t("notif.bell")}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface2 hover:text-fg"
    >
      <span className="text-lg leading-none">🔔</span>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
