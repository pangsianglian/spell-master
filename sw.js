const CACHE_NAME = 'spellmaster-cache-v222';
const urlsToCache = [
  './',
  './index.html',
  './practice.html',
  './spelling.html',
  './lists.html',
  './history.html',
  './import.html',
  './manifest.json',
  './css/style.css',
  './js/app-config.js',
  './js/default-data.js',
  './js/storage.js',
  './js/speech.js',
  './js/session-utils.js',
  './js/practice.js',
  './js/spelling.js',
  './js/import.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.filter(cacheName => cacheName !== CACHE_NAME).map(cacheName => caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppShell = ['.html', '.js', '.css', '.json'].some(ext => url.pathname.endsWith(ext)) || url.pathname.endsWith('/');

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
