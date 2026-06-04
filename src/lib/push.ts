import "server-only";
import webpush from "web-push";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:noreply@gymapp.app";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth_secret: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Stuur een web-push naar een lijst abonnementen. Faalt stil per toestel. */
export async function sendPush(subs: PushSub[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured() || subs.length === 0) return;
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_secret } },
          data,
        );
      } catch {
        // Verlopen/ongeldig abonnement (404/410) — negeren.
      }
    }),
  );
}
