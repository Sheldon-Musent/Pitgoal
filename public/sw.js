// ═══ PITGOAL SERVICE WORKER ═══
// Handles: offline caching, notification clicks, background events

const CACHE_NAME = "pitgoal-v1";
const OFFLINE_URLS = [
  "/",
  "/manifest.json",
];

// ─── INSTALL ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ─── ACTIVATE ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH — network first, cache fallback ───
self.addEventListener("fetch", (event) => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension://")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ═══ NOTIFICATION CLICK HANDLER ═══
// When user taps a notification, open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it and send a message
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          // Send action to the app so it can respond
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            action: data.action || "focus",
            taskId: data.taskId || null,
          });
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow("/");
    })
  );
});

// ─── NOTIFICATION CLOSE (dismissed without clicking) ───
self.addEventListener("notificationclose", (event) => {
  // Optional: track dismissals for analytics later
});

// ─── MESSAGE HANDLER — for future use ───
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
