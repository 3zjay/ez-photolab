const CACHE_NAME = 'photolab-cache-v2.10.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json',
  '/portrait_mock.png',
  '/libraw/libraw.js',
  '/libraw/libraw.wasm',
  '/libraw/worker.js',
  '/libraw/index.js'
];

// Install Event: Pre-cache core static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static app shell...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache.startsWith('photolab-cache-') && cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Advanced Caching Strategy
// - Cache-First for static assets (Vite JS/CSS, WASM)
// - Stale-While-Revalidate for local page assets & HTML
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle local GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Check if it's a static hashed asset or WASM
  const isStaticAsset = url.pathname.includes('/assets/') || 
                         url.pathname.includes('/libraw/') || url.pathname.includes('/mediapipe/') || url.pathname.includes('/transformers/') || url.pathname.includes('/cutout/') ||
                         url.pathname.endsWith('.png') || 
                         url.pathname.endsWith('.svg');

  if (isStaticAsset) {
    // Cache-First strategy: serve from cache immediately, fallback to network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
      })
    );
  } else {
    // Stale-While-Revalidate strategy: serve from cache, fetch in background to update
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(async () => {
          // Offline fallback to cached shell or 503 Response
          return cachedResponse || await caches.match('/index.html') || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
        
        return cachedResponse || fetchPromise;
      })
    );
  }
});
