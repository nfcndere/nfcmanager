const CACHE_NAME = 'nfcadmin-shell-v1';
const SHELL = ['/offline.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (!response.ok) return response;
          return caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()))
            .then(() => response);
        });
        return cached ?? network;
      }),
    );
    return;
  }
  if (request.destination === 'document') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html'))));
  }
});
