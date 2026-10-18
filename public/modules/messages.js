(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyB5a1wErBkuk3s7Jxs5rjIZmO22xERsW9s",
    authDomain: "justus-5b537.firebaseapp.com",
    projectId: "justus-5b537",
    storageBucket: "justus-5b537.firebasestorage.app",
    messagingSenderId: "903585819562",
    appId: "1:903585819562:web:c6c82a841ba94e751599d3",
    measurementId: "G-M2145HJRLC"
  };

  let db = null;
  let unsubscribeMessages = null;

  function getActiveUser() {
    return localStorage.getItem('famcal-user-profile') || 'Dad';
  }

  function formatMessageTime(date) {
    if (!date) return 'Just now';
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeString;
    const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateString} ${timeString}`;
  }

  function sanitizeHtml(str) {
    const temp = document.createElement('div');
    temp.textContent = str || '';
    return temp.innerHTML;
  }

  const LAST_SEEN_MESSAGES_KEY = 'famcal_messages_last_seen';

  function updateMessagesBadge(messages) {
    const badge = document.getElementById('messages-badge');
    if (!badge) return;

    const currentTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    if (currentTab === 'messages') {
      localStorage.setItem(LAST_SEEN_MESSAGES_KEY, String(Date.now()));
      badge.classList.add('hidden');
      return;
    }

    const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_MESSAGES_KEY) || '0', 10);
    const currentUser = getActiveUser().toLowerCase();

    const unreadCount = messages.filter((msg) => {
      const author = (msg.author || '').toLowerCase();
      if (author === currentUser) return false;
      const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate().getTime() : (msg.createdAt ? new Date(msg.createdAt).getTime() : 0);
      return msgTime > lastSeen;
    }).length;

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function renderMessages(messages) {
    const feed = document.getElementById('messages-feed');
    if (!feed) return;

    updateMessagesBadge(messages);

    if (messages.length === 0) {
      feed.innerHTML = `
        <div class="empty-state messages-empty">
          <div class="noticeboard-empty-icon">
            <span class="material-symbols-rounded">chat</span>
          </div>
          <p class="state-title">No messages yet</p>
          <p class="state-text">Send a quick message to start the family conversation!</p>
        </div>
      `;
      return;
    }

    const currentProfile = getActiveUser();

    feed.innerHTML = messages.map(msg => {
      const isMine = (msg.author || '').toLowerCase() === currentProfile.toLowerCase();
      const authorClass = `user-${(msg.author || 'other').toLowerCase()}`;
      const dotClass = `dot-${(msg.author || 'other').toLowerCase()}`;
      const dateObj = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)) : new Date();
      const timeStr = formatMessageTime(dateObj);

      return `
        <div class="chat-message-row ${isMine ? 'is-outgoing' : 'is-incoming'}" data-message-id="${sanitizeHtml(msg.id)}">
          <div class="chat-bubble">
            <div class="chat-bubble-header">
              <span class="member-dot ${dotClass}"></span>
              <span class="chat-bubble-author ${authorClass}">${sanitizeHtml(msg.author || 'Family')}</span>
              <span class="chat-bubble-time">${sanitizeHtml(timeStr)}</span>
              ${isMine ? `
                <button type="button" class="chat-delete-btn" data-action="delete-message" data-id="${sanitizeHtml(msg.id)}" aria-label="Delete message" title="Delete message">
                  <span class="material-symbols-rounded">close</span>
                </button>
              ` : ''}
            </div>
            <p class="chat-bubble-text">${sanitizeHtml(msg.text)}</p>
          </div>
        </div>
      `;
    }).join('');

    feed.scrollTop = feed.scrollHeight;
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!db) {
      alert('Messaging is still connecting. Please try again.');
      return;
    }

    const input = document.getElementById('messages-input');
    const sendBtn = document.getElementById('messages-send-btn');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    if (sendBtn) sendBtn.disabled = true;

    try {
      await db.collection('family_messages').add({
        text,
        author: getActiveUser(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${getActiveUser()} sent a message`,
          body: text,
          sender: getActiveUser()
        })
      }).catch(() => {});

      if (input) {
        input.value = '';
        input.focus();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Could not send message: ' + (err.message || 'Unknown error'));
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  function showConfirmModal({ title, message, confirmText = 'Delete' }) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById('confirm-modal-backdrop');
      const titleEl = document.getElementById('confirm-modal-title');
      const messageEl = document.getElementById('confirm-modal-message');
      const deleteBtn = document.getElementById('confirm-modal-delete-btn');
      const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

      if (!backdrop || !deleteBtn) {
        resolve(window.confirm(message || title || 'Are you sure?'));
        return;
      }

      if (titleEl) titleEl.textContent = title || 'Are you sure?';
      if (messageEl) messageEl.textContent = message || 'This action cannot be undone.';
      if (deleteBtn) deleteBtn.textContent = confirmText;

      const cleanup = () => {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
        deleteBtn.removeEventListener('click', onConfirm);
        cancelBtn?.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
      };

      const onConfirm = () => {
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      const onBackdrop = (e) => {
        if (e.target === backdrop) onCancel();
      };

      deleteBtn.addEventListener('click', onConfirm);
      cancelBtn?.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);

      backdrop.classList.remove('hidden');
      backdrop.setAttribute('aria-hidden', 'false');
    });
  }

  async function handleMessageActions(e) {
    const btn = e.target.closest('button[data-action="delete-message"]');
    if (!btn || !db) return;
    const msgId = btn.dataset.id;
    if (!msgId) return;

    const confirmed = await showConfirmModal({
      title: 'Delete Message?',
      message: 'Are you sure you want to delete this message?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      await db.collection('family_messages').doc(msgId).delete();
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Could not delete message: ' + (err.message || 'Unknown error'));
    }
  }

  async function handleClearAllMessages() {
    if (!db) return;
    const confirmed = await showConfirmModal({
      title: 'Clear All Messages?',
      message: 'Are you sure you want to clear the entire family chat? This cannot be undone.',
      confirmText: 'Clear All'
    });
    if (!confirmed) return;

    const clearBtn = document.getElementById('messages-clear-btn');
    if (clearBtn) clearBtn.disabled = true;

    try {
      const snapshot = await db.collection('family_messages').get();
      if (snapshot.empty) return;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to clear messages:', err);
      alert('Could not clear messages: ' + (err.message || 'Unknown error'));
    } finally {
      if (clearBtn) clearBtn.disabled = false;
    }
  }

  function initFirestore() {
    if (typeof firebase === 'undefined') return;

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    const form = document.getElementById('messages-compose-form');
    if (form) {
      form.addEventListener('submit', handleSendMessage);
    }

    const feed = document.getElementById('messages-feed');
    if (feed) {
      feed.addEventListener('click', handleMessageActions);
    }

    const clearBtn = document.getElementById('messages-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', handleClearAllMessages);
    }

    window.addEventListener('famcal-tab-changed', (e) => {
      if (e.detail && e.detail.tab === 'messages') {
        localStorage.setItem(LAST_SEEN_MESSAGES_KEY, String(Date.now()));
        const badge = document.getElementById('messages-badge');
        if (badge) badge.classList.add('hidden');

        const currentFeed = document.getElementById('messages-feed');
        if (currentFeed) {
          setTimeout(() => {
            currentFeed.scrollTop = currentFeed.scrollHeight;
          }, 60);
        }
      }
    });

    if (unsubscribeMessages) unsubscribeMessages();

    unsubscribeMessages = db.collection('family_messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        renderMessages(messages);
      }, (err) => {
        console.error('Messages snapshot error:', err);
        const currentFeed = document.getElementById('messages-feed');
        if (currentFeed) {
          currentFeed.innerHTML = `
            <div class="empty-state error-state">
              <p class="state-title">Messages Offline</p>
              <p class="state-text">${sanitizeHtml(err.message || 'Could not connect to messaging service.')}</p>
            </div>
          `;
        }
      });
  }

  function init() {
    if (window.firebase) {
      initFirestore();
    } else {
      window.addEventListener('load', () => {
        if (window.firebase) initFirestore();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
