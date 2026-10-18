importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

fetch('/.netlify/functions/firebase-config')
  .then((res) => res.json())
  .then((config) => {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || payload.data?.title || 'JustUs Family Update';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'You have a new update in JustUs.',
        icon: '/JustUs Icon.png',
        badge: '/JustUs Icon.png',
        data: payload.data?.url || '/'
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  })
  .catch((err) => {
    console.warn('SW Firebase config fetch error:', err.message);
  });

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
