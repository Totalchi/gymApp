"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";
import { savePushSubscription, removePushSubscription } from "@/app/notifications/actions";

type State = "loading" | "unsupported" | "default" | "granted" | "denied";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function EnablePushButton() {
  const t = useT();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported || !VAPID_PUBLIC) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as State);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission as State);
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth_secret: json.keys?.auth ?? "",
      });
      setState("granted");
    } catch {
      setState("denied");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("default");
    } catch {
      // negeren
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-faint">
        {t("notif.iosHint")}
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-faint">
        {t("notif.denied")}
      </p>
    );
  }

  if (state === "granted") {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <span className="text-sm text-emerald-300">✓ {t("notif.enabled")}</span>
        <button
          onClick={disable}
          disabled={busy}
          className="text-xs text-faint underline hover:text-danger disabled:opacity-50"
        >
          {t("notif.disable")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={busy}
      className="mb-4 w-full btn-primary px-4 py-3 text-sm"
    >
      🔔 {t("notif.enable")}
    </button>
  );
}
