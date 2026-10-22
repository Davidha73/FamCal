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
}

initMessaging().catch((err) => {
  console.warn('SW Firebase messaging bootstrap error:', err);
});

let lastHandledTag = '';
let lastHandledTime = 0;

function canShowNotification(tag) {
  const now = Date.now();
  if (tag && tag === lastHandledTag && (now - lastHandledTime) < 4000) {
    return false;
  }
  lastHandledTag = tag || '';
  lastHandledTime = now;
  return true;
}

// Primary push listener
self.addEventListener('push', (event) => {
  let title = 'JustUs Family Update';
  let body = 'You have a new update in JustUs.';
  let dataUrl = '/';
  let targetTab = 'calendar';
  let notifTag = null;

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.notification?.title || payload.data?.title || payload.title || title;
      body = payload.notification?.body || payload.data?.body || payload.body || body;
      dataUrl = payload.data?.url || payload.fcmOptions?.link || '/';
      targetTab = payload.data?.tab || (dataUrl.includes('messages') ? 'messages' : (dataUrl.includes('noticeboard') ? 'noticeboard' : 'calendar'));
      notifTag = payload.data?.tag || payload.notification?.tag || null;
    } catch (_) {
      try {
        const text = event.data.text();
        if (text) body = text;
      } catch (_) {}
    }
  }

  const resolvedTag = notifTag || `famcal_${body.slice(0, 30)}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const isAppForeground = windowClients.some((client) => client.visibilityState === 'visible' || client.focused);
      if (isAppForeground) {
        return;
      }
      if (!canShowNotification(resolvedTag)) {
        return;
      }
      const options = {
        body,
        icon: '/JustUs Icon.png',
        badge: '/JustUs Icon.png',
        vibrate: [200, 100, 200],
        sound: 'default',
        tag: resolvedTag,
        data: { url: dataUrl, tab: targetTab }
      };
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawData = event.notification.data || '/';
  let urlToOpen = typeof rawData === 'string' ? rawData : (rawData.url || '/');
  let targetTab = typeof rawData === 'object' && rawData.tab ? rawData.tab : null;

  if (!targetTab) {
    if (urlToOpen.includes('messages')) targetTab = 'messages';
    else if (urlToOpen.includes('noticeboard') || urlToOpen.includes('lists')) targetTab = 'noticeboard';
    else if (urlToOpen.includes('calendar')) targetTab = 'calendar';
  }

  if (targetTab && !urlToOpen.includes('tab=')) {
    urlToOpen = `/?tab=${targetTab}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (targetTab) {
            client.postMessage({
              type: 'NAVIGATE_TAB',
              tab: targetTab,
              url: urlToOpen
            });
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
