(() => {
  'use strict';

  let db = null;
  let unsubscribeMessages = null;
  let currentMessages = [];

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
    currentMessages = messages;

    feed.innerHTML = messages.map(msg => {
      const isMine = (msg.author || '').toLowerCase() === currentProfile.toLowerCase();
      const authorClass = `user-${(msg.author || 'other').toLowerCase()}`;
      const dotClass = `dot-${(msg.author || 'other').toLowerCase()}`;
      const dateObj = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)) : new Date();
      const timeStr = formatMessageTime(dateObj);

      const isMentioned = window.FamCalMentions && window.FamCalMentions.isUserMentioned(msg.text, currentProfile);
      const textHtml = window.FamCalMentions
        ? window.FamCalMentions.formatMentions(sanitizeHtml(msg.text))
        : sanitizeHtml(msg.text);

      let linkedHtml = '';
      if (msg.linkedId) {
        const icon = msg.linkedType === 'list' ? 'checklist' : 'sticky_note_2';
        const typeLabel = msg.linkedType === 'list' ? 'List' : 'Note';
        linkedHtml = `
          <div class="chat-linked-row">
            <button type="button" class="notice-linked-pill" data-scroll-to="${sanitizeHtml(msg.linkedId)}" title="Jump to linked ${typeLabel}">
              <span class="material-symbols-rounded">${icon}</span>
              <span class="notice-linked-text">Linked ${typeLabel}: ${sanitizeHtml(msg.linkedTitle || typeLabel)}</span>
            </button>
          </div>
        `;
      }

      return `
        <div class="chat-message-row ${isMine ? 'is-outgoing' : 'is-incoming'} ${isMentioned ? 'is-mentioned' : ''}" data-message-id="${sanitizeHtml(msg.id)}">
          <div class="chat-bubble">
            <div class="chat-bubble-header">
              <span class="member-dot ${dotClass}"></span>
              <span class="chat-bubble-author ${authorClass}">${sanitizeHtml(msg.author || 'Family')}</span>
              <span class="chat-bubble-time">${sanitizeHtml(timeStr)}</span>
              ${isMentioned ? '<span class="mention-tag">Mentioned you</span>' : ''}
              <button type="button" class="chat-convert-btn" data-action="convert-message" data-id="${sanitizeHtml(msg.id)}" aria-label="Copy to note, list or event" title="Copy to note, list or event">
                <span class="material-symbols-rounded">drive_file_move</span>
              </button>
              ${isMine ? `
                <button type="button" class="chat-delete-btn" data-action="delete-message" data-id="${sanitizeHtml(msg.id)}" aria-label="Delete message" title="Delete message">
                  <span class="material-symbols-rounded">close</span>
                </button>
              ` : ''}
            </div>
            ${msg.imageUrl ? `
              <div class="chat-bubble-image-wrap">
                <img src="${sanitizeHtml(msg.imageUrl)}" alt="Photo from ${sanitizeHtml(msg.author)}" class="chat-bubble-image" loading="lazy">
              </div>
            ` : ''}
            ${textHtml ? `<p class="chat-bubble-text">${textHtml}</p>` : ''}
            ${linkedHtml}
          </div>
        </div>
      `;
    }).join('');

    feed.scrollTop = feed.scrollHeight;
  }

  async function ensureDb() {
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
      } catch (err) {
        console.warn('ensureDb failed:', err);
      }
    }
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        db = firebase.firestore();
        return db;
      } catch (_) {}
    }
    return null;
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const database = await ensureDb();
    if (!database) {
      alert('Messaging is still connecting. Please try again.');
      return;
    }

    if (!unsubscribeMessages) {
      initFirestore();
    }

    const input = document.getElementById('messages-input');
    const sendBtn = document.getElementById('messages-send-btn');
    const text = input ? input.value.trim() : '';
    const photo = window.FamCalPhotos ? window.FamCalPhotos.getPendingPhoto() : null;
    if (!text && !photo) return;

    if (sendBtn) sendBtn.disabled = true;

    try {
      const attachment = window.FamCalMessageLinks ? window.FamCalMessageLinks.getPendingAttachment() : null;

      const messageDoc = {
        text,
        author: getActiveUser(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (photo && photo.dataUrl) {
        messageDoc.imageUrl = photo.dataUrl;
      }

      if (attachment) {
        messageDoc.linkedId = attachment.id;
        messageDoc.linkedType = attachment.type;
        messageDoc.linkedTitle = attachment.title;
      }

      await database.collection('family_messages').add(messageDoc);

      if (window.FamCalMessageLinks) {
        window.FamCalMessageLinks.clearPendingAttachment();
      }
      if (window.FamCalPhotos) {
        window.FamCalPhotos.clearPendingPhoto();
      }

      const senderToken = localStorage.getItem('famcal_fcm_token') || null;
      const mentions = window.FamCalMentions ? window.FamCalMentions.extractMentions(text) : [];
      const notifBody = text || '📷 Sent a photo';
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${getActiveUser()} sent a message`,
          body: notifBody,
          sender: getActiveUser(),
          senderToken,
          mentions,
          url: '/?tab=messages',
          tab: 'messages'
        })
      }).catch((err) => console.warn('Message notification error:', err));

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
    const convertBtn = e.target.closest('button[data-action="convert-message"]');
    if (convertBtn) {
      const msgId = convertBtn.dataset.id;
      const msg = currentMessages.find(m => m.id === msgId);
      if (msg && window.FamCalMessageLinks) {
        window.FamCalMessageLinks.openConvertMenu(msg, convertBtn);
      }
      return;
    }

    const pill = e.target.closest('.notice-linked-pill');
    if (pill) {
      const targetId = pill.dataset.scrollTo;
      if (targetId && typeof window.FamCalSwitchTab === 'function') {
        window.FamCalSwitchTab('noticeboard');
        setTimeout(() => {
          if (window.FamCalLists && typeof window.FamCalLists.scrollAndHighlight === 'function') {
            window.FamCalLists.scrollAndHighlight(targetId);
          }
        }, 150);
      }
      return;
    }

    const btn = e.target.closest('button[data-action="delete-message"]');
    if (!btn) return;
    const database = await ensureDb();
    if (!database) return;
    const msgId = btn.dataset.id;
    if (!msgId) return;

    const confirmed = await showConfirmModal({
      title: 'Delete Message?',
      message: 'Are you sure you want to delete this message?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      await database.collection('family_messages').doc(msgId).delete();
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Could not delete message: ' + (err.message || 'Unknown error'));
    }
  }

  async function handleClearAllMessages() {
    const database = await ensureDb();
    if (!database) return;
    const confirmed = await showConfirmModal({
      title: 'Clear All Messages?',
      message: 'Are you sure you want to clear the entire family chat? This cannot be undone.',
      confirmText: 'Clear All'
    });
    if (!confirmed) return;

    const clearBtn = document.getElementById('messages-clear-btn');
    if (clearBtn) clearBtn.disabled = true;

    try {
      const snapshot = await database.collection('family_messages').get();
      if (snapshot.empty) return;

      const batch = database.batch();
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

  async function initFirestore() {
    await ensureDb();

    if (!db) {
      console.warn('Firestore database unavailable for Messages.');
      return;
    }

    if (unsubscribeMessages) unsubscribeMessages();

    unsubscribeMessages = db.collection('family_messages')
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        messages.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeA - timeB;
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

  function setupDomEvents() {
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

    const input = document.getElementById('messages-input');
    if (input) {
      if (window.FamCalMentions) window.FamCalMentions.attachAutocomplete(input);
      if (window.FamCalMessageLinks) window.FamCalMessageLinks.attachSlashCommands(input);
    }

    window.addEventListener('famcal-firebase-ready', (e) => {
      if (e.detail && e.detail.db) {
        db = e.detail.db;
        initFirestore();
      }
    });

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
        if (!db) {
          initFirestore();
        }
      }
    });
  }

  function init() {
    setupDomEvents();
    renderMessages([]);
    initFirestore();
    window.addEventListener('load', () => {
      if (!db) initFirestore();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
