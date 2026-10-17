// JustUs - Event Notifications Module
(function () {
  let swRegistration = null;
  let cachedEvents = [];
  let checkInterval = null;
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
      alert('Notifications are not supported by this browser.');
      return false;
    }
    const result = await Notification.requestPermission();
    updateUI();
    if (result === 'granted') {
      evaluateUpcomingEvents();
    }
    return result === 'granted';
  }

  function updateUI() {
    const statusText = document.getElementById('notification-status-text');
    const notifIcon = document.getElementById('notification-icon');

    if (!('Notification' in window)) {
      if (statusText) statusText.textContent = 'Not supported on this browser';
      if (notifIcon) notifIcon.textContent = 'notifications_off';
      return;
    }

    const permission = Notification.permission;
    if (permission === 'granted') {
      if (statusText) statusText.textContent = 'Alerts 1hr before & at event';
      if (notifIcon) notifIcon.textContent = 'notifications_active';
    } else if (permission === 'denied') {
      if (statusText) statusText.textContent = 'Blocked in device settings';
      if (notifIcon) notifIcon.textContent = 'notifications_off';
    } else {
      if (statusText) statusText.textContent = 'Tap to enable reminders';
      if (notifIcon) notifIcon.textContent = 'notifications';
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

  async function initNotifications() {
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.ready;
      } catch (_) {}
    }

    const toggleBtn = document.getElementById('notification-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
          alert('Notifications are not supported by this browser.');
          return;
        }
        if (Notification.permission === 'granted') {
          showNotification('JustUs Reminders Active', {
            body: 'Reminders are scheduled for 1 hour before and at the start time of scheduled events.'
          });
        } else {
          await requestPermission();
        }
      });
    }

    updateUI();

    if (!checkInterval) {
      checkInterval = setInterval(evaluateUpcomingEvents, 60000);
    }
  }

  window.FamCalNotifications = {
    initNotifications,
    checkUpcomingEvents
  };
})();
