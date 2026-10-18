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
  let unsubscribeNotes = null;
  let currentNotes = [];

  const CATEGORY_ICONS = {
    Note: '📝',
    Reminder: '⏰',
    Urgent: '🚨',
    Shoutout: '🎉',
    Love: '❤️'
  };

  function getActiveUser() {
    return localStorage.getItem('famcal-user-profile') || 'Dad';
  }

  function formatRelativeTime(date) {
    if (!date) return 'Just now';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function sanitizeHtml(str) {
    const temp = document.createElement('div');
    temp.textContent = str || '';
    return temp.innerHTML;
  }

  const LAST_SEEN_KEY = 'famcal_noticeboard_last_seen';

  function updateNoticeboardBadge(notes) {
    const badge = document.getElementById('noticeboard-badge');
    if (!badge) return;

    const currentTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    if (currentTab === 'noticeboard') {
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      badge.classList.add('hidden');
      return;
    }

    const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10);
    const currentUser = getActiveUser().toLowerCase();

    const unreadCount = notes.filter((note) => {
      const author = (note.author || '').toLowerCase();
      if (author === currentUser) return false;
      const noteTime = note.createdAt?.toDate ? note.createdAt.toDate().getTime() : (note.createdAt ? new Date(note.createdAt).getTime() : 0);
      return noteTime > lastSeen;
    }).length;

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function renderNotes(notes) {
    const container = document.getElementById('noticeboard-grid');
    const counter = document.getElementById('noticeboard-count');
    if (!container) return;

    updateNoticeboardBadge(notes);

    if (counter) {
      counter.textContent = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
    }

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="empty-state noticeboard-empty">
          <div class="noticeboard-empty-icon">
            <span class="material-symbols-rounded">forum</span>
          </div>
          <p class="state-title">No messages yet</p>
          <p class="state-text">Post a note, reminder, or shoutout for the family!</p>
          <button type="button" class="btn btn-primary" id="noticeboard-empty-add-btn">
            <span class="material-symbols-rounded">add</span>
            <span>Leave a Note</span>
          </button>
        </div>
      `;
      const emptyAddBtn = document.getElementById('noticeboard-empty-add-btn');
      if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', openNoteModal);
      }
      return;
    }

    const currentProfile = getActiveUser();

    container.innerHTML = notes.map(note => {
      const authorClass = `user-${(note.author || 'other').toLowerCase()}`;
      const dotClass = `dot-${(note.author || 'other').toLowerCase()}`;
      const isPinned = Boolean(note.pinned);
      const isAuthor = (note.author || '').toLowerCase() === currentProfile.toLowerCase();
      const likedByMe = Array.isArray(note.likes) && note.likes.includes(currentProfile);
      const likesCount = Array.isArray(note.likes) ? note.likes.length : 0;
      const category = note.category || 'Note';
      const categoryIcon = CATEGORY_ICONS[category] || '📝';
      const categoryLabel = `${categoryIcon} ${category}`;
      const timeStr = note.createdAt ? formatRelativeTime(note.createdAt.toDate ? note.createdAt.toDate() : new Date(note.createdAt)) : 'Just now';

      return `
        <article class="notice-card ${isPinned ? 'is-pinned' : ''}" data-note-id="${sanitizeHtml(note.id)}">
          <header class="notice-card-header">
            <div class="notice-card-author">
              <span class="member-dot ${dotClass}" aria-hidden="true"></span>
              <span class="notice-author-name ${authorClass}">${sanitizeHtml(note.author || 'Family Member')}</span>
              <span class="notice-timestamp">${sanitizeHtml(timeStr)}</span>
            </div>
            <div class="notice-card-badges">
              <span class="notice-category-tag category-${category.toLowerCase()}">${sanitizeHtml(categoryLabel)}</span>
              ${isPinned ? '<span class="notice-pin-indicator" title="Pinned note"><span class="material-symbols-rounded">push_pin</span></span>' : ''}
            </div>
          </header>
          <div class="notice-card-body">
            <p class="notice-card-text">${sanitizeHtml(note.text)}</p>
          </div>
          <footer class="notice-card-footer">
            <button type="button" class="notice-action-btn notice-like-btn ${likedByMe ? 'is-liked' : ''}" data-action="like" data-id="${sanitizeHtml(note.id)}" aria-label="Heart note">
              <span class="material-symbols-rounded">${likedByMe ? 'favorite' : 'favorite_border'}</span>
              <span class="notice-like-count">${likesCount > 0 ? likesCount : ''}</span>
            </button>
            <div class="notice-footer-right">
              ${isAuthor ? `
                <button type="button" class="notice-action-btn notice-delete-btn" data-action="delete" data-id="${sanitizeHtml(note.id)}" aria-label="Delete note">
                  <span class="material-symbols-rounded">delete</span>
                </button>
              ` : ''}
            </div>
          </footer>
        </article>
      `;
    }).join('');
  }

  function openNoteModal() {
    const modal = document.getElementById('notice-modal-backdrop');
    const form = document.getElementById('notice-form');
    const authorSelect = document.getElementById('notice-author');
    if (!modal) return;

    if (form) form.reset();
    if (authorSelect) {
      authorSelect.value = getActiveUser();
    }
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    const textInput = document.getElementById('notice-text');
    if (textInput) {
      setTimeout(() => textInput.focus(), 100);
    }
  }

  function closeNoteModal() {
    const modal = document.getElementById('notice-modal-backdrop');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!db) {
      alert('Firebase connection is not ready. Please try again.');
      return;
    }

    const textInput = document.getElementById('notice-text');
    const categorySelect = document.getElementById('notice-category');
    const authorSelect = document.getElementById('notice-author');
    const pinnedCheckbox = document.getElementById('notice-pinned');
    const submitBtn = document.getElementById('notice-submit-btn');

    const text = textInput ? textInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'Note';
    const author = authorSelect ? authorSelect.value : getActiveUser();
    const pinned = pinnedCheckbox ? pinnedCheckbox.checked : false;

    if (!text) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
    }

    try {
      await db.collection('noticeboard_notes').add({
        text,
        category,
        author,
        pinned,
        likes: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${author} posted a ${category}`,
          body: text,
          sender: author
        })
      }).catch(() => {});

      closeNoteModal();
    } catch (err) {
      console.error('Error adding notice:', err);
      alert('Could not post notice: ' + (err.message || 'Unknown error'));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Note';
      }
    }
  }

  async function handleCardAction(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn || !db) return;
    const action = btn.dataset.action;
    const noteId = btn.dataset.id;
    if (!action || !noteId) return;

    if (action === 'like') {
      const currentProfile = getActiveUser();
      const noteRef = db.collection('noticeboard_notes').doc(noteId);
      const isLiked = btn.classList.contains('is-liked');
      try {
        if (isLiked) {
          await noteRef.update({
            likes: firebase.firestore.FieldValue.arrayRemove(currentProfile)
          });
        } else {
          await noteRef.update({
            likes: firebase.firestore.FieldValue.arrayUnion(currentProfile)
          });
        }
      } catch (err) {
        console.warn('Failed to update reaction:', err);
      }
    } else if (action === 'delete') {
      const confirmed = await showConfirmModal({
        title: 'Delete Notice?',
        message: 'Are you sure you want to delete this notice from the board?',
        confirmText: 'Delete'
      });
      if (!confirmed) return;
      try {
        await db.collection('noticeboard_notes').doc(noteId).delete();
      } catch (err) {
        console.error('Failed to delete note:', err);
        alert('Could not delete note: ' + (err.message || 'Unknown error'));
      }
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

  function setupTabs() {
    const tabCalendar = document.getElementById('tab-nav-calendar');
    const tabNoticeboard = document.getElementById('tab-nav-noticeboard');
    const tabMessages = document.getElementById('tab-nav-messages');
    const calendarView = document.getElementById('calendar-view-container');
    const noticeboardView = document.getElementById('noticeboard-view-container');
    const messagesView = document.getElementById('messages-view-container');

    const tabs = [
      { id: 'calendar', btn: tabCalendar, view: calendarView },
      { id: 'noticeboard', btn: tabNoticeboard, view: noticeboardView },
      { id: 'messages', btn: tabMessages, view: messagesView }
    ];

    window.FamCalSwitchTab = function(targetTab) {
      tabs.forEach(tab => {
        const isActive = tab.id === targetTab;
        if (tab.btn) {
          tab.btn.classList.toggle('is-active', isActive);
          tab.btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
        if (tab.view) {
          tab.view.classList.toggle('hidden', !isActive);
        }
      });
      localStorage.setItem('famcal-active-tab', targetTab);
      if (targetTab === 'noticeboard') {
        localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
        const badge = document.getElementById('noticeboard-badge');
        if (badge) badge.classList.add('hidden');
      }
      window.dispatchEvent(new CustomEvent('famcal-tab-changed', { detail: { tab: targetTab } }));
    };

    tabs.forEach(tab => {
      if (tab.btn) {
        tab.btn.addEventListener('click', () => window.FamCalSwitchTab(tab.id));
      }
    });

    const savedTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    window.FamCalSwitchTab(savedTab);
  }

  function initFirestore() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded.');
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    const grid = document.getElementById('noticeboard-grid');
    if (grid) {
      grid.addEventListener('click', handleCardAction);
    }

    const form = document.getElementById('notice-form');
    if (form) {
      form.addEventListener('submit', handleAddNote);
    }

    const openModalBtn = document.getElementById('open-notice-modal-btn');
    if (openModalBtn) {
      openModalBtn.addEventListener('click', openNoteModal);
    }

    const closeModalBtn = document.getElementById('notice-modal-close-btn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeNoteModal);
    }

    const cancelModalBtn = document.getElementById('notice-modal-cancel-btn');
    if (cancelModalBtn) {
      cancelModalBtn.addEventListener('click', closeNoteModal);
    }

    const modalBackdrop = document.getElementById('notice-modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeNoteModal();
      });
    }

    if (unsubscribeNotes) unsubscribeNotes();

    unsubscribeNotes = db.collection('noticeboard_notes')
      .onSnapshot((snapshot) => {
        const notes = [];
        snapshot.forEach((doc) => {
          notes.push({ id: doc.id, ...doc.data() });
        });

        notes.sort((a, b) => {
          if (Boolean(b.pinned) !== Boolean(a.pinned)) {
            return b.pinned ? 1 : -1;
          }
          const timeA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
          const timeB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
          return timeB - timeA;
        });

        currentNotes = notes;
        renderNotes(currentNotes);
      }, (err) => {
        console.error('Firestore snapshot error:', err);
        const container = document.getElementById('noticeboard-grid');
        if (container) {
          container.innerHTML = `
            <div class="empty-state error-state">
              <p class="state-title">Noticeboard Offline</p>
              <p class="state-text">${sanitizeHtml(err.message || 'Could not connect to Firebase Firestore.')}</p>
            </div>
          `;
        }
      });
  }

  function init() {
    setupTabs();
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
