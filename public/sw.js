const CACHE_NAME = 'famcal-shell-v48';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/modules/notifications.js',
  '/modules/shifts.js',
  '/modules/splash.js',
  '/modules/updater.js',
  '/modules/noticeboard.js',
  '/modules/messages.js',
  '/app.js',
  '/style.css',
  '/JustUs Splash.png',
  '/JustUs Icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
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
