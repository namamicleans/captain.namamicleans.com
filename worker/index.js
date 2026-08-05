// Custom worker — next-pwa merges this into the generated sw.js
// (see `customWorkerDir` in next.config.js docs). Runs alongside the
// auto-generated Workbox precaching, not instead of it.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Namami Captain", body: event.data.text() };
  }

  const { title, body, url, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Namami Captain", {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url: url || "/", ...data },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
