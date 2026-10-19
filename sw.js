// Offline cache for the app's own files. Network first, so a new build is seen as soon as
// the device is online (avoids the stale-cache trap); the cache is only the offline fallback.
// Bank data never passes through here: it is read from the folder or IndexedDB, not fetched.
const CACHE = 'spending-app';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // cache: 'no-cache' makes the browser re-check with GitHub every time (a cheap 304 when nothing changed).
  // Without it, GitHub's max-age=600 let a reopened app run the previous build for up to 10 minutes.
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
