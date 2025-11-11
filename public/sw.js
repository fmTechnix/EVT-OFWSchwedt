// Service Worker for Push Notifications
// Version: 2.0 - Production Build mit Logo Fix
const SW_VERSION = '2.0';
const CACHE_NAME = `evt-cache-v${SW_VERSION}`;

console.log(`[Service Worker] Version ${SW_VERSION} starting`);

self.addEventListener('install', function(event) {
  console.log(`[Service Worker] Installing version ${SW_VERSION}`);
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log(`[Service Worker] Activating version ${SW_VERSION}`);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
  
  let data = {
    title: 'Neue Benachrichtigung',
    body: 'Sie haben eine neue Benachrichtigung erhalten',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };
  
  if (event.data) {
    try {
      const parsed = event.data.json();
      console.log('[Service Worker] Parsed push data:', parsed);
      data = parsed;
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback: Use data as text
      data.body = event.data.text();
    }
  }
  
  console.log('[Service Worker] Showing notification:', data);
  
  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.data,
    tag: 'evt-notification', // Group notifications
    renotify: true, // Re-alert user for same tag
    requireInteraction: false, // iOS prefers false
    silent: false,
    vibrate: [200, 100, 200],
  };
  
  console.log('[Service Worker] Notification options:', notificationOptions);
  
  const promiseChain = self.registration.showNotification(data.title, notificationOptions)
    .then(() => {
      console.log('[Service Worker] Notification shown successfully');
    })
    .catch((error) => {
      console.error('[Service Worker] Error showing notification:', error);
    });
  
  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  );
});

self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[Service Worker] Push subscription changed:', event);
  
  // Handle subscription changes (e.g., if it expires)
  // You might want to re-subscribe the user here
});
