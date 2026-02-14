/* NotaryOS basic offline cache (single-page app) */
const CACHE_NAME = 'notaryos-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-init.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Keep app shell fresh to avoid stale JS requiring hard refreshes
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isAppShell = sameOrigin && (url.pathname.endsWith('/app.js') || url.pathname.endsWith('/index.html') || url.pathname === '/' || url.pathname.endsWith('/'));
  if (req.method === 'GET' && isAppShell) {
    event.respondWith(
      fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return resp;
      }).catch(() => caches.match(req).then(res => res || caches.match('./index.html')))
    );
    return;
  }

  // SPA navigation: serve index.html (cache-first)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then(res => res || fetch(req).catch(() => caches.match('./index.html')))
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
