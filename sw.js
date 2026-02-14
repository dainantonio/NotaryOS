/* NotaryOS basic offline cache (single-page app) */
const CACHE_NAME = 'notaryos-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // SPA navigation: serve index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(res => res || fetch(req).catch(() => caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then((resp) => {
      // Cache same-origin GET responses
      try{
        const url = new URL(req.url);
        if (req.method === 'GET' && url.origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
      }catch(e){}
      return resp;
    }).catch(() => cached))
  );
});
