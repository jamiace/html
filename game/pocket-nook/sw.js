/* Pocket Nook service worker: lets the game open without a network after the first visit.
   - everything on this site: network first (always the newest version when online), the cached copy only when offline
   - music, Firebase, Google, YouTube and anything on other sites: never cached here
   Change VERSION to throw the old cache away. */
const VERSION = 'nook-v0.911-mobile-controls';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then(c => c.addAll(['./', 'index.html', 'css/style.css', 'manifest.webmanifest?icons=root-v1']).catch(() => { }))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/music/')) return;
  // network first for everything, so a new version is never mixed with old files; the cache is only the offline copy
  e.respondWith(fetch(req).then(r => { if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./'))); });
