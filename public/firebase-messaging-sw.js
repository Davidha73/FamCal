importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyB5a1wErBkuk3s7Jxs5rjIZmO22xERsW9s",
  authDomain: "justus-5b537.firebaseapp.com",
  projectId: "justus-5b537",
  storageBucket: "justus-5b537.firebasestorage.app",
  messagingSenderId: "903585819562",
  appId: "1:903585819562:web:c6c82a841ba94e751599d3",
  measurementId: "G-M2145HJRLC"
};

firebase.initializeApp(firebaseConfig);
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
