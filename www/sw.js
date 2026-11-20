// IronBody offline cache. Everything the app needs is stored on first visit; photos from Wikipedia still need internet.
const CACHE = 'ironbody-db5090bbe4';
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "fonts/fonts.css",
  "fonts/bebas-neue-400.woff2",
  "fonts/dm-sans-300.woff2",
  "fonts/dm-sans-400.woff2",
  "fonts/dm-sans-500.woff2",
  "fonts/dm-sans-600.woff2",
  "fonts/space-mono-400.woff2",
  "fonts/space-mono-700.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-48.png",
  "icons/icon.svg"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('ironbody-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;          // Wikipedia photos etc.: normal network request
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { event.waitUntil(fresh); return hit; }                       // instant from the cache, refreshed in the background
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') { const home = await cache.match('index.html'); if (home) return home; }
    return Response.error();
  })());
});
