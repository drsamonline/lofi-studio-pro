/* =============================================================================
   Lofi Studio Pro — service worker
   The shell is precached and served cache-first, because the app ships its own
   dependencies (Tone.js lives in vendor/, not on a CDN). That makes the app
   fully offline after one visit and removes the single point of failure the
   previous CDN build had. Bump VERSION to publish new assets.
   ========================================================================== */
const VERSION = 'lofi-2.0.0';
const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/data.js',
  './js/state.js',
  './js/audio.js',
  './js/ui.js',
  './js/main.js',
  './vendor/tone.min.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    /* addAll() rejects the whole install if one file 404s. Add individually
       so a single missing asset degrades the app instead of killing it. */
    await Promise.all(SHELL.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
        console.warn('[SW] could not precache', url, err);
      })
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // never touch third parties

  /* Navigations: try the network so a deploy is picked up immediately, and
     fall back to the cached shell so the app opens with no connection. */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match('./index.html');
        return cached || new Response('<h1>Offline</h1>', {
          status: 503, headers: { 'Content-Type': 'text/html' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.status === 200 && res.type === 'basic') {
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
