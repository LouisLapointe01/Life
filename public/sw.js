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

// Push notifications
self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "Life";
    const options = {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        data: { url: data.url || "/dashboard" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/dashboard";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(url) && "focus" in client) return client.focus();
            }
            return clients.openWindow(url);
        })
    );
});
