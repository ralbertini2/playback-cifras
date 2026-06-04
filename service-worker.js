const CACHE_NAME = 'playback-cifras-v1';
const CORE_ASSETS = ['./', './index.html', './styles.css', './app.js', './songs.json', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
