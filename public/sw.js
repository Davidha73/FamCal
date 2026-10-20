try {
  importScripts('/firebase-messaging-sw.js');
} catch (err) {
  console.warn('FCM SW script import failed:', err);
}

const CACHE_NAME = 'famcal-shell-v79';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/modules/firebase-init.js',
  '/modules/notifications.js',
  '/modules/shifts.js',
  '/modules/splash.js',
  '/modules/updater.js',
  '/modules/navigation.js',
  '/modules/lists.js',
  '/modules/category-enhancements.js',
  '/modules/noticeboard.js',
  '/modules/messages.js',
  '/app.js',
  '/style.css',
  '/JustUs Splash.png',
  '/JustUs Icon.png'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
