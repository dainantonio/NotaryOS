/* NotaryOS offline cache — v4 (bumped to bust any stale v3 blank-page cache) */
const CACHE_NAME = 'notaryos-cache-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-init.js',
  './manifest.webmanifest',
  './icon.svg',
  './js/data/dashboardApi.js',
  './js/components/dashboard/Donut.js',
  './js/components/dashboard/SparkLine.js',
  './js/components/dashboard/RevenueChart.js',
  './js/components/dashboard/Dashboard.js',
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
      .then((keys) => Promise.all(
        keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null)
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // Always network-first for app shell files so updates deploy immediately
  const isAppShell = sameOrigin && (
    url.pathname.endsWith('/app.js') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/')
  );

  if (req.method === 'GET' && isAppShell) {
    event.respondWith(
      fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return resp;
      }).catch(() =>
        caches.match(req).then((res) => res || caches.match('./index.html'))
      )
    );
    return;
  }

  // SPA navigation: serve index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then((res) => res || fetch(req).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Everything else: cache-first, fall back to network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        try {
          if (req.method === 'GET' && sameOrigin) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
        } catch (e) {}
        return resp;
      });
    })
  );
});
