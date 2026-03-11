const CACHE_NAME = "life-v5";
const OFFLINE_URL = "/dashboard";

// Only cache static assets that are guaranteed to exist and return 200
// Do NOT cache pages (/, /dashboard) — they may redirect (auth) and break addAll()
const STATIC_ASSETS = [
    "/manifest.webmanifest",
    "/favicon.ico",
    "/icons/icon-192.png",
    "/icons/icon-192-maskable.png",
    "/icons/icon-512.png",
    "/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            // Use individual cache.add() with catch so one failure doesn't break install
            Promise.allSettled(
                STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
            )
        )
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
                    (event.request.url.includes("/icons/") || event.request.url.includes("/manifest.webmanifest"))
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
