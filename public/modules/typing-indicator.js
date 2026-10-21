// JustUs - Real-Time Typing Indicators Module
(function () {
  'use strict';

  let db = null;
  let typingTimeout = null;
  let lastWriteTime = 0;
  let unsubscribeTyping = null;
  const TYPING_IDLE_DELAY = 3000;
  const WRITE_THROTTLE_MS = 2000;

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

  async function setTypingState(isTyping) {
    const database = await getDb();
    if (!database) return;
    const user = getActiveUser();
    const docId = user.toLowerCase();

    try {
      if (isTyping) {
        lastWriteTime = Date.now();
        await database.collection('family_typing').doc(docId).set({
          user,
          isTyping: true,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } else {
        await database.collection('family_typing').doc(docId).set({
          user,
          isTyping: false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    } catch (_) {}
  }

  function handleTypingInput(hasText) {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    if (!hasText) {
      setTypingState(false);
      return;
    }

    const now = Date.now();
    if (now - lastWriteTime > WRITE_THROTTLE_MS) {
      setTypingState(true);
    }

    typingTimeout = setTimeout(() => {
      setTypingState(false);
    }, TYPING_IDLE_DELAY);
  }

  function renderTypingIndicator(typers) {
    let container = document.getElementById('messages-typing-indicator');
    const feed = document.getElementById('messages-feed');
    if (!feed) return;

    if (!container) {
      container = document.createElement('div');
      container.id = 'messages-typing-indicator';
      container.className = 'messages-typing-container hidden';
      feed.appendChild(container);
    }

    if (typers.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    if (feed.lastElementChild !== container) {
      feed.appendChild(container);
    }

    const names = typers.map(t => t.user);
    let label = '';
    if (names.length === 1) {
      label = `${names[0]} is typing`;
    } else if (names.length === 2) {
      label = `${names[0]} and ${names[1]} are typing`;
    } else {
      label = 'Multiple people are typing';
    }

    const primaryUser = typers[0].user || 'other';
    const dotClass = `dot-${primaryUser.toLowerCase()}`;

    container.innerHTML = `
      <div class="typing-bubble">
        <span class="member-dot ${dotClass}"></span>
        <span class="typing-label">${label}</span>
        <div class="typing-dots-wave">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;

    container.classList.remove('hidden');

    const isNearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 140;
    if (isNearBottom) {
      feed.scrollTop = feed.scrollHeight;
    }
  }

  async function initListener() {
    const database = await getDb();
    if (!database) return;

    if (unsubscribeTyping) unsubscribeTyping();

    unsubscribeTyping = database.collection('family_typing')
      .onSnapshot((snapshot) => {
        const currentUser = getActiveUser().toLowerCase();
        const now = Date.now();
        const activeTypers = [];

        snapshot.forEach((doc) => {
          const data = doc.data() || {};
          const user = (data.user || doc.id || '').toLowerCase();
          if (user === currentUser) return;

          if (data.isTyping) {
            const updated = data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : now;
            if (now - updated < 6000) {
              activeTypers.push({
                user: data.user || doc.id
              });
            }
          }
        });

        renderTypingIndicator(activeTypers);
      }, (err) => {
        console.warn('Typing indicator listener error:', err);
      });
  }

  function setupInputEvents() {
    const input = document.getElementById('messages-input');
    const form = document.getElementById('messages-compose-form');

    if (input) {
      input.addEventListener('input', () => {
        handleTypingInput(input.value.trim().length > 0);
      });

      input.addEventListener('blur', () => {
        if (typingTimeout) clearTimeout(typingTimeout);
        setTypingState(false);
      });
    }

    if (form) {
      form.addEventListener('submit', () => {
        if (typingTimeout) clearTimeout(typingTimeout);
        setTypingState(false);
      });
    }

    window.addEventListener('famcal-tab-changed', (e) => {
      if (e.detail && e.detail.tab === 'messages') {
        initListener();
      } else {
        if (typingTimeout) clearTimeout(typingTimeout);
        setTypingState(false);
      }
    });

    window.addEventListener('beforeunload', () => {
      setTypingState(false);
    });
  }

  function init() {
    setupInputEvents();
    initListener();
    window.addEventListener('famcal-firebase-ready', () => {
      initListener();
    });
  }

  window.FamCalTyping = {
    setTypingState
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
