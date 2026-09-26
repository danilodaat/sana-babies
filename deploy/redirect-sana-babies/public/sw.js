// Service worker "de retiro": reemplaza al del juego en el dominio viejo, borra sus
// cachés, se desinstala y recarga las pestañas/apps abiertas (que caen en la página de mudanza).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.navigate(c.url));
    })(),
  );
});
