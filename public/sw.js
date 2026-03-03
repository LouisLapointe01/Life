const CACHE_NAME = "life-v2";
const OFFLINE_URL = "/dashboard";

const STATIC_ASSETS = [
    "/",
    "/dashboard",
    "/manifest.json",
    "/icons/icon-192.svg",
    "/icons/icon-512.svg",
    "/icons/icon-192-maskable.svg",
    "/icons/icon-512-maskable.svg",
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
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
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
