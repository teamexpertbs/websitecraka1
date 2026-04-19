const CACHE_NAME = 'craka-osint-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/android/launchericon-48x48.png',
  '/android/launchericon-72x72.png',
  '/android/launchericon-96x96.png',
  '/android/launchericon-144x144.png',
  '/android/launchericon-192x192.png',
  '/android/launchericon-512x512.png',
  '/ios/152.png',
  '/ios/167.png',
  '/ios/180.png',
  '/ios/192.png',
  '/ios/512.png',
  '/windows/Square150x150Logo.scale-200.png'
];

// ===== INSTALL =====
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('CraKa SW v4: Cache opened');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// ===== FETCH (Offline Support) =====
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      }
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(function() {
        return caches.match('/index.html');
      });
    })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', function(event) {
  let data = {
    title: 'CraKa OSINT Portal',
    body: 'You have a new notification from CraKa.',
    icon: '/android/launchericon-192x192.png',
    badge: '/android/launchericon-96x96.png',
    vibrate: [100, 50, 100],
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch(e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      data: data.data,
      actions: [
        { action: 'open', title: 'Open CraKa' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', function(event) {
  console.log('CraKa SW: Background sync triggered:', event.tag);
  if (event.tag === 'craka-sync') {
    event.waitUntil(
      fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synced: true }) })
        .catch(function(err) { console.log('Sync failed, will retry:', err); })
    );
  }
});

// ===== PERIODIC BACKGROUND SYNC =====
self.addEventListener('periodicsync', function(event) {
  console.log('CraKa SW: Periodic sync triggered:', event.tag);
  if (event.tag === 'craka-periodic-sync') {
    event.waitUntil(
      fetch('/').then(function(response) {
        return caches.open(CACHE_NAME).then(function(cache) {
          return cache.put('/', response);
        });
      }).catch(function(err) { console.log('Periodic sync failed:', err); })
    );
  }
});