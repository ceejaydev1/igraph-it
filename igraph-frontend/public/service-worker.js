// PWA-FRIENDLY Service Worker v5 - Fixed API Blocking Issue
// Date: 2026-05-27

const CACHE_NAME = 'igraph-it-v5';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// ============================================
// INSTALL EVENT - Cache static assets for PWA
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing PWA worker v5...');
  
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
  
  // Force activate immediately
  self.skipWaiting();
});

// ============================================
// ACTIVATE EVENT - Clean up old caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating PWA worker v5...');
  
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
  
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// ============================================
// FETCH EVENT - Smart caching strategy
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 🔥 CRITICAL: NEVER intercept API calls or external requests
  // These must go directly to the network
  const isExternalRequest = (
    url.pathname.startsWith('/api/') ||                           // Backend API
    url.hostname.includes('googleapis.com') ||                    // Google APIs
    url.hostname.includes('firebaseapp.com') ||                   // Firebase
    url.hostname.includes('identitytoolkit.googleapis.com') ||    // Google Identity
    url.hostname.includes('securetoken.googleapis.com') ||        // Firebase tokens
    url.hostname.includes('brevo.com') ||                         // Email service
    url.hostname !== self.location.hostname                       // Any other external domain
  );
  
  if (isExternalRequest) {
    // Pass through - don't intercept
    event.respondWith(fetch(event.request));
    return;
  }
  
  // ✅ For static assets (JS, CSS, images) - Cache First strategy
  if (event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image') {
    
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
        return new Response('Network error', { status: 408 });
      })
    );
    return;
  }
  
  // ✅ For HTML navigation - Network First, fallback to cached index
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log('[SW] Offline mode - serving cached index.html');
        return caches.match('/index.html');
      })
    );
    return;
  }
  
  // Default - don't intercept anything else
  event.respondWith(fetch(event.request));
});

// ============================================
// MESSAGE EVENT - Handle messages from client
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});