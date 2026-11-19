const CACHE_NAME = 'bjs-academy-v5';
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

// Install Event - skip waiting immediately to activate newest assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('SW Precache warning:', err);
      });
    })
  );
});

// Activate Event - aggressively delete all old caches and claim existing clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW purging stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Strict Network-Only for API, Network-First for HTML/Nav, Cache-First for static hashed assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET or cross-origin requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. 🔴 STRICT NETWORK-ONLY FOR API CALLS (Never cache database/auth/quiz/lesson API calls)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. 🔴 SERVICE WORKER SCRIPT: Always network
  if (url.pathname === '/sw.js') {
    return;
  }

  // 3. 🟢 NAVIGATION / HTML REQUESTS: STRICT NETWORK-FIRST
  // HTML contains hashed chunk names. Must ALWAYS fetch fresh HTML from server so updates load immediately.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache only if device is strictly offline
          return caches.match(request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // 4. 🟢 STATIC ASSETS (JS, CSS, images): Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Listen for SKIP_WAITING from client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// =========================================================================
// FREE BROWSER PUSH NOTIFICATIONS (PWA Web Push) - ZERO EMAIL COST
// =========================================================================
self.addEventListener('push', (event) => {
  let data = {
    title: 'BJS & Bar Aspirants Academy',
    body: 'নতুন লেকচার বা মডেল টেস্ট নোটিশ এসেছে!',
    url: '/'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: data.url || '/' },
    vibrate: [150, 50, 150],
    actions: [
      { action: 'open', title: 'এখনই দেখুন' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'BJS Academy', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
