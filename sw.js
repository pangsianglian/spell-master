const CACHE_NAME = 'spellmaster-cache-v11';
const urlsToCache = [
  './',
  './index.html',
  './practice.html',
  './spelling.html',
  './lists.html',
  './history.html',
  './manifest.json',
  './css/style.css',
  './js/app-config.js',
  './js/default-data.js',
  './js/storage.js',
  './js/speech.js',
  './js/session-utils.js',
  './js/practice.js',
  './js/spelling.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
