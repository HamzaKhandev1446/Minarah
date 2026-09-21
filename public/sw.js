const SHELL_CACHE = "minarah-shell-v1";
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  if (typeof payload.title !== "string" || typeof payload.body !== "string")
    return;
  const url =
    typeof payload.url === "string" &&
    /^\/mosques\/[a-z0-9-]+$/.test(payload.url)
      ? payload.url
      : "/";
  event.waitUntil(
    self.registration.showNotification(payload.title.slice(0, 200), {
      body: payload.body.slice(0, 500),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag:
        typeof payload.tag === "string" ? payload.tag.slice(0, 200) : "minarah",
      data: { url },
    }),
  );
});
// Notification destinations are restricted to this app's mosque pages.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url;
  const path =
    typeof target === "string" && /^\/mosques\/[a-z0-9-]+$/.test(target)
      ? target
      : "/";
  event.waitUntil(
    self.clients.openWindow(new URL(path, self.location.origin).href),
  );
});
const SHELL = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith("minarah-shell-") && key !== SHELL_CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET")
    return;
  // Never cache requests, schedules, authentication, admin or private responses.
  if (
    /^\/(admin|auth|platform|claims)(\/|$)/.test(url.pathname) ||
    /\/claim$/.test(url.pathname)
  )
    return;
  if (event.request.mode === "navigate")
    event.respondWith(
      fetch(event.request).catch(
        async () => (await caches.match("/offline.html")) || Response.error(),
      ),
    );
});
