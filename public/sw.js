const CACHE_NAME = "life-v3";
const OFFLINE_URL = "/dashboard";

const STATIC_ASSETS = [
    "/",
    "/dashboard",
    "/manifest.json",
    "/favicon.ico",
    "/icons/icon-16.png",
    "/icons/icon-32.png",
    "/icons/icon-48.png",
    "/icons/icon-72.png",
    "/icons/icon-96.png",
    "/icons/icon-128.png",
    "/icons/icon-144.png",
    "/icons/icon-192.png",
    "/icons/icon-192-maskable.png",
    "/icons/icon-256.png",
    "/icons/icon-384.png",
    "/icons/icon-512.png",
    "/icons/icon-512-maskable.png",
    "/icons/apple-icon-180.png",
    "/icons/apple-icon-152.png",
    "/icons/apple-icon-167.png",
    "/icons/apple-icon-120.png",
    "/icons/apple-icon-76.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Skip non-GET and chrome-extension requests
    if (event.request.method !== "GET") return;
    if (event.request.url.startsWith("chrome-extension://")) return;

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() =>
                caches.match(OFFLINE_URL).then((r) => r || caches.match("/") || new Response("Offline", { status: 503 }))
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (
                    response.status === 200 &&
                    response.type === "basic" &&
                    (event.request.url.includes("/icons/") || event.request.url.includes("/manifest.json"))
                ) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});

/* ═══════════════════════════════════════════
   Push Notifications
   ═══════════════════════════════════════════ */

self.addEventListener("push", (event) => {
    console.log("[SW Push] Événement push reçu", event.data ? event.data.text() : "(vide)");
    const data = event.data ? event.data.json() : {};
    const { title, body, conversationId, url } = data;

    const targetUrl = url || (conversationId ? `/dashboard/messages?conv=${conversationId}` : "/dashboard/messages");

    const options = {
        body: body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        tag: `msg-${Date.now()}`,
        renotify: true,
        data: { url: targetUrl, conversationId: conversationId || null },
        actions: conversationId
            ? [
                  { action: "reply", title: "Répondre", type: "text", placeholder: "Votre message…" },
                  { action: "open", title: "Ouvrir" },
              ]
            : [{ action: "open", title: "Ouvrir" }],
    };

    event.waitUntil(self.registration.showNotification(title || "Life", options));
});

self.addEventListener("notificationclick", (event) => {
    const { url, conversationId } = event.notification.data || {};
    event.notification.close();

    // Réponse inline (Android Chrome)
    if (event.action === "reply" && event.reply && conversationId) {
        event.waitUntil(
            fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ conversation_id: conversationId, content: event.reply }),
            }).catch(() => {})
        );
        return;
    }

    // Ouvrir / focus l'app
    const targetUrl = url || "/dashboard/messages";
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                for (const client of windowClients) {
                    if ("focus" in client) {
                        client.focus();
                        client.navigate(targetUrl);
                        return;
                    }
                }
                return clients.openWindow(targetUrl);
            })
    );
});
