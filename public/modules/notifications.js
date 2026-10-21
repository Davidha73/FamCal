// JustUs - Event Notifications Module
(function () {
  let swRegistration = null;
  let cachedEvents = [];
  let checkInterval = null;
  let currentDeviceToken = null;
  try {
    currentDeviceToken = localStorage.getItem('famcal_fcm_token');
  } catch (_) {}
  const scheduledTimers = new Map();
  const NOTIFIED_STORAGE_KEY = 'famcal_notified_events';

  function getNotifiedSet() {
    try {
      const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) {
      return new Set();
    }
  }

  function markEventNotified(key) {
    try {
      const set = getNotifiedSet();
      set.add(key);
      const arr = Array.from(set).slice(-150);
      localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  async function showNotification(title, options = {}) {
    const defaultOptions = {
      icon: '/JustUs Icon.png',
      badge: '/JustUs Icon.png',
      vibrate: [200, 100, 200],
      data: '/'
    };
    const finalOptions = { ...defaultOptions, ...options };

    if (swRegistration && swRegistration.showNotification) {
      return swRegistration.showNotification(title, finalOptions);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, finalOptions);
    }
  }

  async function requestPermission() {
    if (!('Notification' in window)) {
      return false;
    }
    const result = await Notification.requestPermission();
    updateUI();
    if (result === 'granted') {
      evaluateUpcomingEvents();
    }
    return result === 'granted';
  }

  function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isStandalone() {
    return ('standalone' in window.navigator && window.navigator.standalone) ||
           window.matchMedia('(display-mode: standalone)').matches;
  }

  function updateUI() {
    const statusText = document.getElementById('notification-status-text');
    const toggleInput = document.getElementById('notification-toggle-input');
    const iosHint = document.getElementById('notification-ios-hint');

    if (isIos() && !isStandalone()) {
      if (iosHint) iosHint.classList.remove('hidden');
    } else {
      if (iosHint) iosHint.classList.add('hidden');
    }

    const userPref = localStorage.getItem('famcal_notifications_enabled');
    const hasNotificationApi = ('Notification' in window);

    if (userPref === 'false') {
      if (statusText) statusText.textContent = 'Disabled';
      if (toggleInput) toggleInput.checked = false;
      return;
    }

    if (hasNotificationApi && Notification.permission === 'granted') {
      if (statusText) {
        statusText.textContent = currentDeviceToken ? 'Active (Push Connected)' : 'Active (Notifications Enabled)';
      }
      if (toggleInput) toggleInput.checked = true;
    } else if (hasNotificationApi && Notification.permission === 'denied') {
      if (statusText) statusText.textContent = 'Blocked in Phone Settings';
      if (toggleInput) toggleInput.checked = false;
    } else if (userPref === 'true') {
      if (statusText) statusText.textContent = 'Enabled';
      if (toggleInput) toggleInput.checked = true;
    } else {
      if (statusText) statusText.textContent = 'Tap to enable';
      if (toggleInput) toggleInput.checked = false;
    }
  }

  function getEventDisplayTitle(evt) {
    const raw = evt.summary || 'Family Event';
    return raw.replace(/^\[(Dad|Mum|Owen|Liv|Olivia|Other)\]/i, '$1').replace(/^Olivia\b/i, 'Liv');
  }

  function evaluateUpcomingEvents() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!Array.isArray(cachedEvents) || cachedEvents.length === 0) return;

    const now = Date.now();
    const notified = getNotifiedSet();

    cachedEvents.forEach((evt) => {
      const rawStart = evt.start?.dateTime;
      if (!rawStart || !evt.id) return;

      const startTime = new Date(rawStart).getTime();
      const diffMs = startTime - now;
      const diffMinutes = Math.round(diffMs / 60000);
      const title = getEventDisplayTitle(evt);

      // 1. Remind 1 hour before (between 50 and 65 minutes away)
      const oneHourKey = `${evt.id}_1hr_${startTime}`;
      if (diffMinutes >= 50 && diffMinutes <= 65 && !notified.has(oneHourKey)) {
        markEventNotified(oneHourKey);
        showNotification(`Upcoming: ${title}`, {
          body: `${title} starts in 1 hour.`,
          tag: oneHourKey
        });
      }

      // Schedule exact 1-hour timer if event starts in 60m - 12h
      const msUntilOneHour = diffMs - 60 * 60 * 1000;
      if (msUntilOneHour > 0 && msUntilOneHour <= 12 * 60 * 60 * 1000 && !scheduledTimers.has(oneHourKey)) {
        const timerId = setTimeout(() => {
          scheduledTimers.delete(oneHourKey);
          if (!getNotifiedSet().has(oneHourKey)) {
            markEventNotified(oneHourKey);
            showNotification(`Upcoming: ${title}`, {
              body: `${title} starts in 1 hour.`,
              tag: oneHourKey
            });
          }
        }, msUntilOneHour);
        scheduledTimers.set(oneHourKey, timerId);
      }

      // 2. Remind at the time of the event (between -2 and +3 minutes of start)
      const startKey = `${evt.id}_start_${startTime}`;
      if (diffMinutes >= -2 && diffMinutes <= 3 && !notified.has(startKey)) {
        markEventNotified(startKey);
        showNotification(`Starting Now: ${title}`, {
          body: `${title} is starting now.`,
          tag: startKey
        });
      }

      // Schedule exact start timer if event starts in 0 - 12h
      if (diffMs > 0 && diffMs <= 12 * 60 * 60 * 1000 && !scheduledTimers.has(startKey)) {
        const timerId = setTimeout(() => {
          scheduledTimers.delete(startKey);
          if (!getNotifiedSet().has(startKey)) {
            markEventNotified(startKey);
            showNotification(`Starting Now: ${title}`, {
              body: `${title} is starting now.`,
              tag: startKey
            });
          }
        }, diffMs);
        scheduledTimers.set(startKey, timerId);
      }
    });
  }

  function checkUpcomingEvents(events) {
    if (Array.isArray(events)) {
      cachedEvents = events;
    }
    evaluateUpcomingEvents();
  }

  async function registerFCMToken(showFeedback = false) {
    if (typeof firebase === 'undefined' || !firebase.messaging || !('serviceWorker' in navigator)) {
      if (showFeedback) alert('Firebase messaging or service worker is not supported in this browser window.');
      return;
    }
    try {
      let vapidKey = null;
      if (typeof window.FamCalGetFirebase === 'function') {
        try {
          const fb = await window.FamCalGetFirebase();
          vapidKey = fb.vapidKey;
        } catch (_) {}
      }

      let swReg = await navigator.serviceWorker.getRegistration('/');
      if (!swReg) {
        swReg = await navigator.serviceWorker.register('/sw.js');
      }
      if (swReg.installing || swReg.waiting) {
        await new Promise((resolve) => {
          const sw = swReg.installing || swReg.waiting;
          if (!sw || sw.state === 'activated') return resolve();
          sw.addEventListener('statechange', function onState() {
            if (this.state === 'activated') {
              this.removeEventListener('statechange', onState);
              resolve();
            }
          });
          setTimeout(resolve, 2000);
        });
      }

      const messaging = firebase.messaging();
      let token = null;
      let tokenError = null;
      try {
        token = await messaging.getToken({
          serviceWorkerRegistration: swReg,
          ...(vapidKey ? { vapidKey } : {})
        });
      } catch (err) {
        tokenError = err;
        console.warn('FCM getToken error:', err);
      }

      if (token) {
        currentDeviceToken = token;
        try {
          localStorage.setItem('famcal_fcm_token', token);
        } catch (_) {}

        const currentUser = localStorage.getItem('famcal-user-profile') || 'Dad';
        if (firebase.firestore) {
          const db = firebase.firestore();
          await db.collection('fcm_tokens').doc(token).set({
            token,
            user: currentUser,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log('FCM token synchronized for:', currentUser);
        }
        updateUI();
        if (showFeedback) {
          alert(`Success: Push token registered and saved in database for ${currentUser}!`);
        }
      } else if (showFeedback) {
        alert('Could not obtain push token: ' + (tokenError ? tokenError.message : 'Unknown error. Make sure app is running from Home Screen.'));
      }

      messaging.onMessage((payload) => {
        // App is actively open in foreground - silence notification banners to prevent disruptive popups
      });
    } catch (err) {
      console.warn('FCM registration error:', err.message);
      if (showFeedback) alert('Registration error: ' + err.message);
    }
  }


  async function initNotifications() {
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.ready;
      } catch (_) {}
    }

    const toggleInput = document.getElementById('notification-toggle-input');
    if (toggleInput) {
      toggleInput.addEventListener('change', async () => {
        const wantsOn = toggleInput.checked;
        localStorage.setItem('famcal_notifications_enabled', wantsOn ? 'true' : 'false');

        if (!wantsOn) {
          updateUI();
          return;
        }

        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            registerFCMToken(false);
          } else if (Notification.permission === 'default') {
            const granted = await requestPermission();
            if (granted) registerFCMToken(false);
          }
        }
        updateUI();
      });
    }


    updateUI();

    if (Notification.permission === 'granted') {
      registerFCMToken();
    }

    if (!checkInterval) {
      checkInterval = setInterval(evaluateUpcomingEvents, 60000);
    }
  }

  window.FamCalNotifications = {
    initNotifications,
    checkUpcomingEvents,
    registerFCMToken,
    showNotification
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
  } else {
    initNotifications();
  }
})();
