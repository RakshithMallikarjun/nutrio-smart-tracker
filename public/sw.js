// Nutrio service worker — network-first for HTML/JS/CSS, cache-first only for hashed /assets/.
const CACHE = "nutrio-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "CLEAR_CACHES") {
    e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first only for fingerprinted Vite assets (filename hash → immutable).
  const isHashedAsset = /\/assets\/.+\.[a-f0-9]{6,}\.(js|css|woff2?|png|jpg|jpeg|svg|webp)$/i.test(url.pathname);

  if (isHashedAsset) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached ?? fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // Network-first for everything else (HTML, JSON, dynamic data, unhashed JS).
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (e.request.mode === "navigate" && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached ?? caches.match("/dashboard")))
  );
});

self.addEventListener("push", (e) => {
  const data = (() => { try { return e.data?.json() ?? {}; } catch { return {}; } })();
  e.waitUntil(
    self.registration.showNotification(data.title ?? "Nutrio", {
      body: data.body ?? "Time to log your meal!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag ?? "nutrio-meal-reminder",
      data: { url: "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((cs) => {
      const existing = cs.find((c) => c.url.includes("/dashboard"));
      return existing ? existing.focus() : clients.openWindow("/dashboard");
    })
  );
});
