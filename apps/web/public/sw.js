// Service worker mínimo de PlaticApp: habilita la instalación como PWA.
// No cachea nada (passthrough) para evitar contenido viejo.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  /* passthrough: deja que el navegador haga la petición normal (sin caché) */
});
