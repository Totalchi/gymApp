import type { Lang } from "@/lib/i18n";

export type NotificationType =
  | "coach_swap"
  | "coach_add"
  | "coach_remove"
  | "follow_request"
  | "follow_accepted"
  | "coach_message"
  | "pr"
  | "reminder_trainingday"
  | "reminder_inactive";

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
    case "follow_request":
      return "👋";
    case "follow_accepted":
      return "✅";
    case "coach_message":
      return "💬";
    case "pr":
      return "🏆";
    case "reminder_trainingday":
      return "📅";
    case "reminder_inactive":
      return "👀";
    default:
      return "🔔";
  }
}

const TEMPLATES: Record<Lang, Record<string, string>> = {
  nl: {
    coach_swap: "{coach} verving {from} door {to} in {routine}",
    coach_add: "{coach} voegde {to} toe aan {routine}",
    coach_remove: "{coach} verwijderde {from} uit {routine}",
    follow_request: "{actor} wil je volgen",
    follow_accepted: "{actor} heeft je volgverzoek geaccepteerd",
    coach_message: "{actor}: {preview}",
    pr: "🏆 Nieuw record op {exercise}: {e1rm} kg (geschat 1RM)",
    reminder_trainingday: "Vandaag staat {day} op het programma 💪",
    reminder_inactive: "Je trainde al {days} dagen niet — tijd voor een sessie?",
  },
  en: {
    coach_swap: "{coach} replaced {from} with {to} in {routine}",
    coach_add: "{coach} added {to} to {routine}",
    coach_remove: "{coach} removed {from} from {routine}",
    follow_request: "{actor} wants to follow you",
    follow_accepted: "{actor} accepted your follow request",
    coach_message: "{actor}: {preview}",
    pr: "🏆 New record on {exercise}: {e1rm} kg (estimated 1RM)",
    reminder_trainingday: "{day} is on today's program 💪",
    reminder_inactive: "You haven't trained in {days} days — time for a session?",
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
  if (type === "coach_message" && data.actorId) {
    return `/messages/${data.actorId}`;
  }
  if (type.startsWith("follow_") && data.actorId) {
    return `/u/${data.actorId}`;
  }
  if (type === "pr" && data.exerciseId) {
    return `/exercises/${data.exerciseId}`;
  }
  if (type === "reminder_trainingday" || type === "reminder_inactive") {
    return "/dashboard";
  }
  return null;
}
