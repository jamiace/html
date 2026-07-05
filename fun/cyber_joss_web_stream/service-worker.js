const CACHE_NAME = 'cyber-joss-paper-v8-stream';
const ASSETS = [
  './',
  './index.html',
  './index_big.html',
  './styles.css?v=8',
  './styles_big.css?v=8',
  './app.js?v=8',
  './assets/joss-paper-fujin.jpg',
  './assets/furnace-mouth.png',
  './assets/app-icon.png',
  './assets/bg-texture.jpg',
  './assets/paper-burn-edge.png',
  './assets/ash-fragments.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.allSettled(ASSETS.map((asset) => cache.add(asset))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
