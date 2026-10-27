const VERSION = 'nfcmanager-sw-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const PAGES_CACHE = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;
const IMAGES_CACHE = `${VERSION}-images`;

const PRECACHE_URLS = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  // Pas de skipWaiting() automatique : l'utilisateur active la mise à jour depuis le bandeau.
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NetworkOnly pour l'authentification et toutes les mutations
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/auth/')
  ) {
    return;
  }

  // NetworkFirst pour les lectures API (/api/site/*) avec repli sur le cache HTTP si hors ligne
  if (url.pathname.startsWith('/api/site/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return (
            cached ||
            new Response(
              JSON.stringify({ status: 'error', message: 'Vous êtes hors ligne.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } },
            )
          );
        }),
    );
    return;
  }

  // CacheFirst pour les images Cloudinary et les icônes
  if (url.hostname === 'res.cloudinary.com' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(IMAGES_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // StaleWhileRevalidate pour les assets statiques Next
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkPromise;
      }),
    );
    return;
  }

  // NetworkFirst pour les navigations HTML avec repli vers la page déjà visitée ou /offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const offlineFallback = await caches.match('/offline.html');
          return offlineFallback || Response.error();
        }),
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Ngaoundéré FC — Administration', body: 'Nouvelle notification', url: '/dashboard' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Charge utile texte simple
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(self.clients.openWindow(targetUrl));
});
