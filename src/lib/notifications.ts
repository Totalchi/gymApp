import type { Lang } from "@/lib/i18n";

export type NotificationType = "coach_swap" | "coach_add" | "coach_remove";

export interface NotificationRow {
  id: string;
  actor_id: string | null;
  type: string;
  data: Record<string, string | undefined>;
  read_at: string | null;
  created_at: string;
}

/** Geeft het icoon voor een notificatietype. */
export function notificationIcon(type: string): string {
  switch (type) {
    case "coach_swap":
      return "🔄";
    case "coach_add":
      return "➕";
    case "coach_remove":
      return "➖";
    default:
      return "🔔";
  }
}

const TEMPLATES: Record<Lang, Record<string, string>> = {
  nl: {
    coach_swap: "{coach} verving {from} door {to} in {routine}",
    coach_add: "{coach} voegde {to} toe aan {routine}",
    coach_remove: "{coach} verwijderde {from} uit {routine}",
  },
  en: {
    coach_swap: "{coach} replaced {from} with {to} in {routine}",
    coach_add: "{coach} added {to} to {routine}",
    coach_remove: "{coach} removed {from} from {routine}",
  },
};

/** Zet een notificatie om in een leesbare zin in de taal van de ontvanger. */
export function renderNotification(
  lang: Lang,
  type: string,
  data: Record<string, string | undefined>,
): string {
  const tpl = TEMPLATES[lang]?.[type] ?? TEMPLATES.en[type] ?? type;
  return tpl.replace(/\{(\w+)\}/g, (_, key: string) => data[key] ?? "…");
}

/** Doelpagina voor een notificatie (waar je naartoe gaat bij klikken). */
export function notificationLink(
  type: string,
  data: Record<string, string | undefined>,
): string | null {
  if (type.startsWith("coach_") && data.routineId) {
    return `/routines/${data.routineId}`;
  }
  return null;
}
