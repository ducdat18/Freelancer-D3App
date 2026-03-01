// Service Worker for Push Notifications
// Version 1.0.0

const CACHE_NAME = 'freelance-dapp-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);

  let notificationData = {
    title: 'Freelance DApp',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/badge.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || data.type || notificationData.tag,
        data: {
          url: data.link || data.url || '/',
          type: data.type,
          ...data
        }
      };
    } catch (error) {
      console.error('Service Worker: Error parsing push data', error);
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Skip caching for API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/offline.html');
      })
  );
});

// Background sync event (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync notifications when back online
      fetch('/api/notifications/sync', {
        method: 'POST'
      }).then((response) => {
        console.log('Service Worker: Notifications synced');
      }).catch((error) => {
        console.error('Service Worker: Sync failed', error);
      })
    );
  }
});

console.log('Service Worker: Loaded and ready');
