// Service worker mínimo de PlaticApp: habilita la instalación como PWA.
// No cachea nada (passthrough) para evitar contenido viejo.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  /* passthrough: deja que el navegador haga la petición normal (sin caché) */
});

// Web Push: muestra la notificación cuando llega.
self.addEventListener("push", (event) => {
  let data = { title: "PlaticApp", body: "", url: "/dashboard" };
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) };
  } catch {
    /* payload no-JSON: usa los valores por defecto */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/192",
      badge: "/icons/192",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

// Al tocar la notificación, abre (o enfoca) la app en la ruta indicada.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
