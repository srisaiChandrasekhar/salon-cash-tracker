// Minimal service worker: just enough to make the app installable
// (Chrome/Android requires one) and keep the app shell usable if the
// network drops mid-session. It deliberately does NOT cache anything
// under /api/ — all shop data must always come from the server, never
// from a stale cache, since it's shared cash-tracking data.
//
// The app shell (index.html etc.) is network-first: every load tries
// the network first so a deployed update shows up immediately, and
// only falls back to the cached copy if the network is unreachable
// (true offline use). A cache-first strategy here previously meant
// every deploy was invisible until a *second* reload, because the
// first reload would show the stale cached page while only updating
// the cache in the background for next time.
const CACHE_NAME = 'salon-cash-tracker-shell-v2';
const SHELL_FILES = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls — always go straight to the network so
  // logins, entries, and settings are never served stale or offline.
  if (url.pathname.startsWith('/api/')) return;

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
