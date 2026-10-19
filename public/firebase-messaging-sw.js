importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const FALLBACK_CONFIG = {
  apiKey: 'AIzaSyB5a1wErBkuk3s7Jxs5rjIZmO22xERsW9s',
  authDomain: 'justus-5b537.firebaseapp.com',
  projectId: 'justus-5b537',
  storageBucket: 'justus-5b537.firebasestorage.app',
  messagingSenderId: '903585819562',
  appId: '1:903585819562:web:c6c82a841ba94e751599d3',
  measurementId: 'G-M2145HJRLC',
  vapidKey: 'BDFLjRAMWYJxydptBw5XbcvZO9Q94pV7bI85u9zUgIs20Q7ghuPpc0kKsZC23T0yYaTPgrHUlEWNcmwx_1_w3g8'
};

async function initMessaging() {
  let config = null;
  try {
    let res = await fetch('/api/firebase-config');
    if (!res.ok) res = await fetch('/.netlify/functions/firebase-config');
    if (res.ok) config = await res.json();
  } catch (_) {}

  if (!config || !config.apiKey) config = FALLBACK_CONFIG;

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
}

initMessaging().catch((err) => {
  console.warn('SW Firebase messaging bootstrap error:', err);
});

// Direct top-level push listener to guarantee immediate execution on iOS lock screen
self.addEventListener('push', (event) => {
  let title = 'JustUs Family Update';
  let body = 'You have a new update in JustUs.';
  let dataUrl = '/';

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.notification?.title || payload.data?.title || payload.title || title;
      body = payload.notification?.body || payload.data?.body || payload.body || body;
      dataUrl = payload.data?.url || payload.fcmOptions?.link || '/';
    } catch (_) {
      try {
        const text = event.data.text();
        if (text) body = text;
      } catch (_) {}
    }
  }

  const options = {
    body,
    icon: '/JustUs Icon.png',
    badge: '/JustUs Icon.png',
    vibrate: [200, 100, 200],
    sound: 'default',
    data: dataUrl
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
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
