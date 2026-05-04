const CACHE_NAME = 'prepost-test-v1';

// Initial assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/papaparse/5.3.2/papaparse.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We attempt to cache static assets.
      // Note: Some CDNs might return opaque responses which are fine for caching
      // but can't be inspected.
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle http/https requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Check if we received a valid response
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'error'
          ) {
            return networkResponse;
          }

          // Clone the response to store it in cache
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            // We cache dynamically visited files (like the .tsx files)
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline and resource not in cache, we could return a fallback here
          console.log('Offline: Could not fetch resource');
        });
    })
  );
});