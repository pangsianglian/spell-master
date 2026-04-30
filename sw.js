const CACHE_NAME = 'spellmaster-cache-v3';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// Install the worker and cache the files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Serve files from the cache if offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});