"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function notifySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC)
  );
}

export type SubscribeResult = "ok" | "denied" | "unsupported" | "error";

/** Demande la permission, s'abonne au push et enregistre l'abonnement côté serveur. */
export async function subscribeNotifications(pollToken?: string): Promise<SubscribeResult> {
  if (!notifySupported() || !VAPID_PUBLIC) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    await navigator.serviceWorker.register("/sw.js").catch(() => {});
    const reg = await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const keys = sub.toJSON().keys ?? {};
    const res = await fetch("/api/notify/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        pollToken: pollToken ?? null,
      }),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

export function useNotify() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  useEffect(() => {
    setSupported(notifySupported());
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);
  return { supported, permission };
}
