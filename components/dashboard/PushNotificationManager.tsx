"use client";

import { useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buffer;
}

export function PushNotificationManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    const register = async () => {
      try {
        // Attendre que le SW soit prêt
        const registration = await navigator.serviceWorker.ready;

        // Vérifier si on a déjà une subscription
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // Ré-enregistrer silencieusement (au cas où le serveur aurait perdu la sub)
          await saveSubscription(existing);
          return;
        }

        // Demander la permission si pas encore accordée
        if (Notification.permission === "denied") return;

        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission !== "granted") return;

        // S'abonner
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await saveSubscription(subscription);
      } catch {
        // Silencieux — l'utilisateur peut refuser
      }
    };

    // Léger délai pour ne pas bloquer le rendu initial
    const timer = setTimeout(register, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
}
