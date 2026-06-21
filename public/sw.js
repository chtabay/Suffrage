// Service worker minimal : juste assez pour rendre l'app installable.
// Passe-plat réseau, aucun cache (pas de risque d'assets périmés).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response("", { status: 504 })));
});
