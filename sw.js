const CACHE = 'poultry-log-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

// Handles a real push message from a push service (e.g. OneSignal, or your own
// web-push server). This is what fires a notification even when the app/tab
// is fully closed and the phone is locked.
self.addEventListener('push', (e) => {
  let data = { title: 'Poultry Log', body: 'Have you logged today\'s eggs?' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'poultry-daily-reminder'
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const c of clients) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});

// Best-effort fallback: Periodic Background Sync (Chrome/Android only, requires
// the app to be installed and used regularly — not supported on iOS/Safari).
// This lets the app check-in and fire a local reminder without a push server,
// on browsers that support it.
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'daily-egg-reminder') {
    e.waitUntil(checkAndRemind());
  }
});

async function checkAndRemind() {
  try {
    const clientsList = await self.clients.matchAll();
    // Ask an open page for today's logged status if one exists; otherwise
    // just remind, since we have no other way to check localStorage here.
    self.registration.showNotification('Poultry Log', {
      body: "Reminder: log today's egg production if you haven't yet.",
      icon: 'icons/icon-192.png',
      tag: 'poultry-daily-reminder'
    });
  } catch (err) {}
}
