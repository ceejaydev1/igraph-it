// PWA-FRIENDLY Service Worker v11 - Development + Production Ready
// Date: 2026-07-16

const CACHE_NAME = 'igraph-it-v11';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/(tabs)/home',
  '/(tabs)/reference',
  '/(tabs)/diagram'
];

// ============================================
// DETECT DEVELOPMENT MODE
// ============================================
const isDevelopment = () => {
  if (typeof self !== 'undefined' && self.location) {
    const hostname = self.location.hostname;
    const port = self.location.port;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           port === '8081' ||
           port === '19000' ||
           port === '19006';
  }
  return false;
};

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing PWA worker v7...');
  
  // Skip caching in development
  if (isDevelopment()) {
    console.log('[SW] Development mode - skipping cache installation');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of STATIC_CACHE_URLS) {
        try {
          await cache.add(url);
          console.log(`[SW] ✅ Cached: ${url}`);
        } catch (err) {
          console.warn(`[SW] ⚠️ Failed to cache ${url}:`, err);
        }
      }
    })
  );
  
  self.skipWaiting();
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating PWA worker v7...');
  
  // In development, unregister immediately
  if (isDevelopment()) {
    console.log('[SW] Development mode - unregistering service worker');
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map(key => caches.delete(key)));
      })
    );
    self.registration.unregister();
    return;
  }
  
  event.waitUntil(
    caches.keys().then((keys) => {
      const deletions = keys.map((key) => {
        if (key !== CACHE_NAME) {
          console.log(`[SW] 🗑️ Deleting old cache: ${key}`);
          return caches.delete(key);
        }
      });
      return Promise.all(deletions);
    })
  );
  
  event.waitUntil(self.clients.claim());
});

// ============================================
// FETCH EVENT
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // DEVELOPMENT MODE - Bypass all caching
  if (isDevelopment()) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // PRODUCTION MODE - Smart caching strategy
  
  // Intercept navigation requests for specific offline-capable routes
  if (event.request.mode === 'navigate') {
    const url = new URL(event.request.url);
    const path = url.pathname + url.search;

// Offline-capable routes that can be served from cache
    const offlineRoutes = [
      '/(tabs)/home',
      '/(tabs)/reference',  
      '/(tabs)/diagram'
    ];

    // Check for exact root match first
    const isRoot = path === '/' || path === '';

    if (isRoot) {
      event.respondWith(
        caches.match('/index.html').then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Offline - serving cached root index.html');
            return cachedResponse;
          }
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response.clone());
              });
            }
            return response;
          }).catch(() => caches.match('/index.html'));
        })
      );
      return;
    }

    if (offlineRoutes.some(route => path === route)) {
      const routeMatch = offlineRoutes.find(route => path === route);
      if (routeMatch) {
        event.respondWith(
          caches.match(routeMatch + '/index.html').then((cachedResponse) => {
            if (cachedResponse) {
              console.log(`[SW] Offline - serving cached ${routeMatch}`);
              return cachedResponse;
            }
            return caches.match('/index.html');
          }).catch(() => {
            console.log('[SW] Offline - no cache, falling back to index.html');
            return caches.match('/index.html');
          })
        );
      }
    }

    // For all other navigation requests, fall back to index.html
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log('[SW] Offline - serving cached index.html');
        return caches.match('/index.html');
      })
    );
    return;
  }
  
  // NEVER intercept API calls or external requests
  const isExternalRequest = (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('brevo.com') ||
    url.hostname !== self.location.hostname
  );
  
  if (isExternalRequest) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Cache static assets (JS, CSS, images, fonts)
  if (event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image' ||
      event.request.destination === 'font') {
    
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }
        
        // Fetch and cache for next time
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      }).catch(() => {
        return fetch(event.request);
      })
    );
    return;
  }
  
  // For everything else, just fetch normally
  event.respondWith(fetch(event.request));
});

// ============================================
// MESSAGE EVENT - Handle skip waiting
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// ONLINE/OFFLINE HANDLING
// ============================================
self.addEventListener('online', () => {
  console.log('[SW] App is online');
  // Optionally trigger a cache update
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'ONLINE' });
    });
  });
});

self.addEventListener('offline', () => {
  console.log('[SW] App is offline');
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'OFFLINE' });
    });
  });
});