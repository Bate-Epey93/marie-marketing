// Service worker — offline-first for a fully static app. Bump VERSION when shipping.
const VERSION = 'marie-v3';
const BASE = self.registration.scope;
const DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(self.location.hostname);
const ASSETS = ['', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'
].map(p => new URL(p, BASE).toString());

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c =>
    Promise.allSettled(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' }))))
  ).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // Fonts: cache on first use, network first.
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
    }
    return;
  }
  if (DEV) { e.respondWith(fetch(req).catch(() => caches.match(req))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r;
  }).catch(() => req.mode === 'navigate' ? caches.match(new URL('index.html', BASE).toString()) : undefined)));
});
