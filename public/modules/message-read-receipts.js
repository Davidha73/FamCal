// JustUs - Message Read Receipts & Swipe Reveal Module
(function () {
  'use strict';

  let db = null;
  let activeOpenRow = null;
  let isUpdatingRead = false;

  function getActiveUser() {
    return localStorage.getItem('famcal-user-profile') || 'Dad';
  }

  async function getDb() {
    if (db) return db;
    if (window.FamCalFirebaseInstance && window.FamCalFirebaseInstance.db) {
      db = window.FamCalFirebaseInstance.db;
      return db;
    }
    if (typeof window.FamCalGetFirebase === 'function') {
      try {
        const fb = await window.FamCalGetFirebase();
        if (fb && fb.db) {
          db = fb.db;
          return db;
        }
      } catch (_) {}
    }
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        db = firebase.firestore();
        return db;
      } catch (_) {}
    }
    return null;
  }

  let readerTimestamps = {};
  let isUpdatingTimestamp = false;

  async function updateLastSeenTimestamp() {
    if (isUpdatingTimestamp) return;
    const database = await getDb();
    if (!database) return;
    const currentUser = getActiveUser();
    const currentTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    if (currentTab !== 'messages') return;

    isUpdatingTimestamp = true;
    try {
      const ref = database.collection('family_message_readers').doc(currentUser.toLowerCase());
      await ref.set({
        name: currentUser,
        lastReadAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to update last seen timestamp:', err);
    } finally {
      setTimeout(() => {
        isUpdatingTimestamp = false;
      }, 2000);
    }
  }

  function initReaderTimestampsListener() {
    getDb().then((database) => {
      if (!database) return;
      database.collection('family_message_readers').onSnapshot((snapshot) => {
        const map = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const name = data.name || doc.id;
          let time = 0;
          if (data.lastReadAt && data.lastReadAt.toMillis) {
            time = data.lastReadAt.toMillis();
          } else if (data.lastReadAt && data.lastReadAt.toDate) {
            time = data.lastReadAt.toDate().getTime();
          } else if (data.updatedAt) {
            time = Number(data.updatedAt);
          }
          map[name.toLowerCase()] = { name, time };
        });
        readerTimestamps = map;
        if (window.FamCalMessages && typeof window.FamCalMessages.refreshRendering === 'function') {
          window.FamCalMessages.refreshRendering();
        }
      }, (err) => {
        console.warn('Reader timestamps listener error:', err);
      });
    });
  }

  function getReadersForMessage(msg) {
    if (!msg) return [];
    const authorLower = (msg.author || '').toLowerCase();
    const msgTime = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate().getTime() : new Date(msg.createdAt).getTime()) : 0;
    const directReaders = Array.isArray(msg.readBy) ? msg.readBy.filter(u => String(u).toLowerCase() !== authorLower) : [];
    const directSet = new Set(directReaders.map(u => String(u).toLowerCase()));

    const result = [...directReaders];

    Object.keys(readerTimestamps).forEach((userKey) => {
      if (userKey === authorLower) return;
      if (!directSet.has(userKey)) {
        const info = readerTimestamps[userKey];
        if (info && info.time && msgTime && info.time >= msgTime) {
          result.push(info.name);
          directSet.add(userKey);
        }
      }
    });

    return result;
  }

  async function markMessagesAsRead(messages) {
    if ((!messages || !messages.length) && window.FamCalMessages && typeof window.FamCalMessages.getCurrentMessages === 'function') {
      messages = window.FamCalMessages.getCurrentMessages();
    }
    const currentTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    if (currentTab !== 'messages') return;

    updateLastSeenTimestamp();

    if (!Array.isArray(messages) || messages.length === 0 || isUpdatingRead) return;
    const database = await getDb();
    if (!database) return;

    const currentUser = getActiveUser();

    const unreadDocs = messages.filter((msg) => {
      if (!msg.id) return false;
      const author = (msg.author || '').toLowerCase();
      if (author === currentUser.toLowerCase()) return false;
      const readBy = Array.isArray(msg.readBy) ? msg.readBy.map(u => String(u).toLowerCase()) : [];
      return !readBy.includes(currentUser.toLowerCase());
    });

    if (unreadDocs.length === 0) return;

    isUpdatingRead = true;
    try {
      const batch = database.batch();
      unreadDocs.forEach((msg) => {
        const ref = database.collection('family_messages').doc(msg.id);
        batch.update(ref, {
          readBy: firebase.firestore.FieldValue.arrayUnion(currentUser)
        });
      });
      await batch.commit();
    } catch (err) {
      console.warn('Failed to update read receipts:', err);
    } finally {
      setTimeout(() => {
        isUpdatingRead = false;
      }, 1000);
    }
  }

  function closeAllDrawers() {
    if (activeOpenRow) {
      activeOpenRow.classList.remove('is-swiped', 'is-dragging');
      const slider = activeOpenRow.querySelector('.chat-bubble-slider');
      if (slider) slider.style.transform = '';
      activeOpenRow = null;
    }
  }

  function attachSwipeHandlers(feed) {
    if (!feed || feed.dataset.swipeAttached) return;
    feed.dataset.swipeAttached = 'true';

    let startX = 0;
    let startY = 0;
    let currentSlider = null;
    let currentRow = null;
    let isHorizontal = null;

    feed.addEventListener('touchstart', (e) => {
      const row = e.target.closest('.chat-message-row.is-outgoing');
      if (!row) {
        closeAllDrawers();
        return;
      }

      if (activeOpenRow && activeOpenRow !== row) {
        closeAllDrawers();
      }

      currentRow = row;
      currentSlider = row.querySelector('.chat-bubble-slider');
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontal = null;
    }, { passive: true });

    feed.addEventListener('touchmove', (e) => {
      if (!currentRow || !currentSlider) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - startX;
      const diffY = currentY - startY;

      if (isHorizontal === null) {
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          isHorizontal = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (!isHorizontal) return;

      if (diffX < 0) {
        currentRow.classList.add('is-dragging');
        let translateX = diffX;
        if (translateX < -130) {
          const overscroll = -130 - translateX;
          translateX = -130 - (overscroll * 0.25);
        }
        currentSlider.style.transform = `translateX(${translateX}px)`;
        currentSlider.style.transition = 'none';
      }
    }, { passive: true });

    feed.addEventListener('touchend', (e) => {
      if (!currentRow || !currentSlider) return;

      const rowToReset = currentRow;
      const sliderToReset = currentSlider;

      if (sliderToReset) {
        sliderToReset.style.transition = '';
        sliderToReset.style.transform = '';
      }

      if (rowToReset) {
        setTimeout(() => {
          rowToReset.classList.remove('is-dragging', 'is-swiped');
        }, 380);
      }

      currentRow = null;
      currentSlider = null;
      isHorizontal = null;
    }, { passive: true });

    document.addEventListener('click', (e) => {
      if (activeOpenRow && !e.target.closest('.chat-message-row.is-outgoing')) {
        closeAllDrawers();
      }
    });
  }

  function init() {
    const feed = document.getElementById('messages-feed');
    if (feed) attachSwipeHandlers(feed);

    initReaderTimestampsListener();

    window.addEventListener('famcal-tab-changed', (e) => {
      if (e.detail && e.detail.tab === 'messages') {
        const feedEl = document.getElementById('messages-feed');
        if (feedEl) attachSwipeHandlers(feedEl);
        markMessagesAsRead();
      } else {
        closeAllDrawers();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const currentTab = localStorage.getItem('famcal-active-tab') || 'calendar';
        if (currentTab === 'messages') {
          markMessagesAsRead();
        }
      }
    });

    window.addEventListener('focus', () => {
      const currentTab = localStorage.getItem('famcal-active-tab') || 'calendar';
      if (currentTab === 'messages') {
        markMessagesAsRead();
      }
    });
  }

  window.FamCalReadReceipts = {
    markMessagesAsRead,
    updateLastSeenTimestamp,
    getReadersForMessage,
    attachSwipeHandlers,
    closeAllDrawers
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
