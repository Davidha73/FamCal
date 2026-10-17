// JustUs - Event Notifications Module
(function () {
  let swRegistration = null;
  const NOTIFIED_STORAGE_KEY = 'famcal_notified_events';

  function getNotifiedSet() {
    try {
      const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) {
      return new Set();
    }
  }

  function markEventNotified(id) {
    try {
      const set = getNotifiedSet();
      set.add(id);
      const arr = Array.from(set).slice(-100);
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
      alert('Notifications are not supported by this browser.');
      return false;
    }
    const result = await Notification.requestPermission();
    updateUI();
    return result === 'granted';
  }

  function updateUI() {
    const statusText = document.getElementById('notification-status-text');
    const notifIcon = document.getElementById('notification-icon');
    const testBtn = document.getElementById('notification-test-btn');

    if (!('Notification' in window)) {
      if (statusText) statusText.textContent = 'Not supported on this browser';
      if (notifIcon) notifIcon.textContent = 'notifications_off';
      if (testBtn) testBtn.classList.add('hidden');
      return;
    }

    const permission = Notification.permission;
    if (permission === 'granted') {
      if (statusText) statusText.textContent = 'Reminders enabled';
      if (notifIcon) notifIcon.textContent = 'notifications_active';
      if (testBtn) testBtn.classList.remove('hidden');
    } else if (permission === 'denied') {
      if (statusText) statusText.textContent = 'Blocked in device settings';
      if (notifIcon) notifIcon.textContent = 'notifications_off';
      if (testBtn) testBtn.classList.add('hidden');
    } else {
      if (statusText) statusText.textContent = 'Tap to enable reminders';
      if (notifIcon) notifIcon.textContent = 'notifications';
      if (testBtn) testBtn.classList.add('hidden');
    }
  }

  function checkUpcomingEvents(events) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!Array.isArray(events) || events.length === 0) return;

    const now = Date.now();
    const notified = getNotifiedSet();

    events.forEach((evt) => {
      const rawStart = evt.start?.dateTime;
      if (!rawStart) return;

      const startTime = new Date(rawStart).getTime();
      const diffMs = startTime - now;
      const diffMinutes = Math.round(diffMs / 60000);

      if (diffMinutes >= 0 && diffMinutes <= 30) {
        const notifKey = `${evt.id}_start_${startTime}`;
        if (!notified.has(notifKey)) {
          markEventNotified(notifKey);
          const title = evt.summary || 'Upcoming Family Event';
          const timeText = diffMinutes === 0 ? 'starting right now' : `starts in ${diffMinutes} min`;
          showNotification(`Reminder: ${title}`, {
            body: `${title} ${timeText}.`,
            tag: notifKey
          });
        }
      }
    });
  }

  async function initNotifications() {
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.ready;
      } catch (_) {}
    }

    const toggleBtn = document.getElementById('notification-toggle-btn');
    const testBtn = document.getElementById('notification-test-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
          alert('Notifications are not supported by this browser.');
          return;
        }
        if (Notification.permission === 'granted') {
          showNotification('JustUs Notifications', {
            body: 'Event notifications are active on this device!'
          });
        } else {
          await requestPermission();
        }
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        await showNotification('JustUs Test Notification', {
          body: 'Success! Your device is ready to display native event alerts.'
        });
      });
    }

    updateUI();
  }

  window.FamCalNotifications = {
    initNotifications,
    showNotification,
    checkUpcomingEvents
  };
})();
