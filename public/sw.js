// GymApp service worker — web push + slimme caching (offline + snelheid).

const STATIC_CACHE = "gymapp-static-v1";
const PAGE_CACHE = "gymapp-pages-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Oude caches opruimen.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

// Network-first met een tijdslimiet: bij een trage (koude) server tonen we na
// `timeoutMs` direct de gecachete pagina; het netwerkantwoord ververst intussen
// de cache op de achtergrond voor de volgende keer.
async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  });
  // Voorkom "unhandled rejection" wanneer we hieronder al de cache serveerden.
  network.catch(() => {});

  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      network.then(
        (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    // Niets in cache: dan toch (langer) op het netwerk wachten.
    try {
      return await network;
    } catch {}
    const dash = await cache.match("/dashboard");
    if (dash) return dash;
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Alleen onze eigen origin; nooit API/auth cachen (altijd vers + veilig).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Content-hashed assets (wijzigen per build): cache-first = supersnel.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Volledige paginanavigaties: network-first (updates blijven binnenkomen),
  // val terug op cache wanneer je offline bent.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE, 2500));
    return;
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "GymApp";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/notifications" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
