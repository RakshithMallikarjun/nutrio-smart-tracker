const CACHE = "nutrio-v1";
const SHELL = ["/", "/dashboard", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(SHELL.map((u) => c.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (e.request.mode === "navigate") {
        return fetch(e.request)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
            return res;
          })
          .catch(() => cached ?? caches.match("/dashboard"));
      }
      return cached ?? fetch(e.request);
    })
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
