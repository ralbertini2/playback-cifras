const CACHE='playback-cifras-v6';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const url = new URL(event.request.url);
  if(url.origin !== location.origin) return;

  // Nunca manter config.js preso no cache: ele contém Client ID/API Key e muda durante configurações.
  if(url.pathname.endsWith('/config.js')){
    event.respondWith(fetch(event.request, {cache:'no-store'}));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached || fetch(event.request))
  );
});
