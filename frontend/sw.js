const CACHE_NAME = 'shortbread-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Ensure the new SW takes control immediately
      return self.clients.claim();
    })
  );
});

// Fetch event with network-first strategy for API calls, cache-first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response
          const responseToCache = response.clone();
          
          // Only cache successful responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(request);
        })
    );
    return;
  }

  // Handle app shell and static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(request).then(response => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache static assets
          if (request.method === 'GET' && 
              (request.destination === 'style' || 
               request.destination === 'script' || 
               request.destination === 'image' ||
               url.pathname.endsWith('.css') ||
               url.pathname.endsWith('.js') ||
               url.pathname.endsWith('.png') ||
               url.pathname.endsWith('.ico'))) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});