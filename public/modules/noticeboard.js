(() => {
  'use strict';

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

  function formatReminderDateTime(dtString) {
    if (!dtString) return '';
    try {
      const d = new Date(dtString);
      if (isNaN(d.getTime())) return dtString;
      return d.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (_) {
      return dtString;
    }
  }

  function renderNotes(notes) {
    const container = document.getElementById('noticeboard-grid');
    const counter = document.getElementById('noticeboard-count');
    if (!container) return;

    updateNoticeboardBadge(notes);

    if (counter) {
      counter.textContent = `${notes.length} ${notes.length === 1 ? 'item' : 'items'}`;
    }

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="empty-state noticeboard-empty">
          <div class="noticeboard-empty-icon">
            <span class="material-symbols-rounded">forum</span>
          </div>
          <p class="state-title">No messages yet</p>
          <p class="state-text">Pin a note, reminder, or shoutout for the family!</p>
          <button type="button" class="btn btn-primary" id="noticeboard-empty-add-btn">
            <span class="material-symbols-rounded">add</span>
            <span>Pin a Note</span>
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

    const activeNotes = notes.filter((n) => {
      if (window.FamCalCategoryEnhancements && window.FamCalCategoryEnhancements.isNoteExpired(n)) {
        return false;
      }
      return true;
    });

    activeNotes.sort((a, b) => {
      const aUrgent = a.category === 'Urgent' && !a.completed;
      const bUrgent = b.category === 'Urgent' && !b.completed;
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeB - timeA;
    });

    container.innerHTML = activeNotes.map(note => {
      const authorKey = (note.author || 'other').toLowerCase();
      const authorClass = `user-${authorKey}`;
      const dotClass = `dot-${authorKey}`;
      const isPinned = Boolean(note.pinned);
      const isCompleted = Boolean(note.completed);
      const isAuthor = (note.author || '').toLowerCase() === currentProfile.toLowerCase();
      const likedByMe = Array.isArray(note.likes) && note.likes.includes(currentProfile);
      const likesCount = Array.isArray(note.likes) ? note.likes.length : 0;
      const isList = note.type === 'list';
      const isUrgent = note.category === 'Urgent';
      const isLove = note.category === 'Love';
      const category = note.category || (isList ? 'List' : 'Note');
      const categoryIcon = isList ? '📋' : (CATEGORY_ICONS[category] || '📝');
      const categoryLabel = isList ? '📋 List' : `${categoryIcon} ${category}`;
      const timeStr = note.createdAt ? formatRelativeTime(note.createdAt.toDate ? note.createdAt.toDate() : new Date(note.createdAt)) : 'Just now';
      let isCollapsed = false;
      if (isList) {
        try {
          const stored = JSON.parse(localStorage.getItem('famcal-collapsed-lists') || '[]');
          isCollapsed = Array.isArray(stored) && stored.includes(note.id);
        } catch (_) {}
      }

      let linkedHtml = '';
      if (note.linkedListId) {
        const linked = notes.find(n => n.id === note.linkedListId);
        if (linked) {
          linkedHtml = `
            <div class="notice-linked-row">
              <button type="button" class="notice-linked-pill" data-scroll-to="${sanitizeHtml(linked.id)}" title="Jump to linked list">
                <span class="material-symbols-rounded">checklist</span>
                <span class="notice-linked-text">Linked List: ${sanitizeHtml(linked.title || 'Checklist')}</span>
              </button>
            </div>
          `;
        }
      } else if (note.linkedNoteId) {
        const linked = notes.find(n => n.id === note.linkedNoteId);
        if (linked) {
          const preview = linked.text ? (linked.text.slice(0, 30) + '...') : 'Note';
          linkedHtml = `
            <div class="notice-linked-row">
              <button type="button" class="notice-linked-pill" data-scroll-to="${sanitizeHtml(linked.id)}" title="Jump to linked note">
                <span class="material-symbols-rounded">sticky_note_2</span>
                <span class="notice-linked-text">Linked Note: ${sanitizeHtml(preview)}</span>
              </button>
            </div>
          `;
        }
      }

      let contentHtml = '';

      if (isList) {
        const items = note.items || [];
        const doneCount = items.filter(it => it.done).length;
        const totalCount = items.length;

        contentHtml = `
          <div class="list-card-content">
            <div class="list-card-title-row">
              <div class="list-title-left">
                <button type="button" class="icon-button icon-button-ghost list-collapse-btn" data-list-id="${sanitizeHtml(note.id)}" aria-label="Toggle list collapse" aria-expanded="${isCollapsed ? 'false' : 'true'}" title="${isCollapsed ? 'Expand list' : 'Collapse list'}">
                  <span class="material-symbols-rounded">${isCollapsed ? 'expand_more' : 'expand_less'}</span>
                </button>
                <h3 class="list-card-title">${sanitizeHtml(note.title || 'Checklist')}</h3>
              </div>
              <span class="list-progress-pill">${doneCount}/${totalCount} done</span>
            </div>
            <div class="list-collapsible-body ${isCollapsed ? 'is-collapsed' : ''}">
              <ul class="list-items-checklist">
                ${items.map(it => `
                  <li class="list-checklist-item ${it.done ? 'is-done' : ''}">
                    <label class="list-checkbox-label">
                      <input type="checkbox" class="list-checkbox-input" data-list-id="${sanitizeHtml(note.id)}" data-item-id="${sanitizeHtml(it.id)}" ${it.done ? 'checked' : ''}>
                      <span class="list-checkbox-custom"></span>
                      <span class="list-item-text">${sanitizeHtml(it.text)}</span>
                    </label>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        `;
      } else {
        const reminderBadgeHtml = (note.category === 'Reminder' && note.reminderTime) ? `
          <div class="notice-reminder-badge">
            <span class="material-symbols-rounded">alarm</span>
            <span>Remind: ${formatReminderDateTime(note.reminderTime)}</span>
          </div>
        ` : '';

        const loveBadgeHtml = (note.category === 'Love' && note.recipient) ? `
          <div class="notice-love-badge">
            <span>❤️ For ${sanitizeHtml(note.recipient)}</span>
          </div>
        ` : '';

        const expiryBadgeHtml = (note.category === 'Note' && note.expiryHours) ? `
          <div class="notice-expiry-badge">
            <span>⏱️ Auto-clears in ${sanitizeHtml(note.expiryHours)}h</span>
          </div>
        ` : '';

        let urgentAckHtml = '';
        if (isUrgent) {
          const acks = Array.isArray(note.acknowledgedBy) ? note.acknowledgedBy : [];
          const iAcked = acks.includes(currentProfile);
          const ackNames = acks.length > 0 ? `Seen by ${acks.join(', ')}` : 'Not yet acknowledged';
          urgentAckHtml = `
            <div class="notice-urgent-ack-row">
              <button type="button" class="notice-urgent-ack-btn ${iAcked ? 'is-acknowledged' : ''}" data-action="acknowledge" data-id="${sanitizeHtml(note.id)}">
                <span class="material-symbols-rounded">${iAcked ? 'check_circle' : 'visibility'}</span>
                <span>${iAcked ? 'Seen by you' : 'Mark as Seen'}</span>
              </button>
              <span class="notice-urgent-ack-list">${sanitizeHtml(ackNames)}</span>
            </div>
          `;
        }

        contentHtml = `
          <div class="notice-card-body">
            <p class="notice-card-text">${sanitizeHtml(note.text)}</p>
            ${reminderBadgeHtml}
            ${loveBadgeHtml}
            ${expiryBadgeHtml}
            ${urgentAckHtml}
          </div>
        `;
      }

      return `
        <article class="notice-card author-border-${authorKey} ${isPinned ? 'is-pinned' : ''} ${isCompleted ? 'is-completed' : ''} ${isList ? 'is-list-card' : ''} ${isUrgent ? 'is-urgent' : ''} ${isLove ? 'is-love' : ''}" data-note-id="${sanitizeHtml(note.id)}">
          <header class="notice-card-header">
            <div class="notice-card-author">
              <span class="member-dot ${dotClass}" aria-hidden="true"></span>
              <span class="notice-author-name ${authorClass}">${sanitizeHtml(note.author || 'Family Member')}</span>
              <span class="notice-timestamp">${sanitizeHtml(timeStr)}</span>
            </div>
            <div class="notice-card-badges">
              <span class="notice-category-tag category-${isList ? 'list' : category.toLowerCase()}">${sanitizeHtml(categoryLabel)}</span>
              ${isPinned ? '<span class="notice-pin-indicator" title="Pinned note"><span class="material-symbols-rounded">push_pin</span></span>' : ''}
            </div>
          </header>
          ${contentHtml}
          <footer class="notice-card-footer">
            <div class="notice-footer-left">
              ${linkedHtml}
            </div>
            <div class="notice-footer-right">
              <button type="button" class="btn-action btn-complete notice-complete-btn ${isCompleted ? 'is-completed' : ''}" data-action="toggle-complete" data-id="${sanitizeHtml(note.id)}" aria-label="${isCompleted ? 'Mark as incomplete' : 'Mark as completed'}" title="${isCompleted ? 'Completed' : 'Mark as completed'}">
                <span class="material-symbols-rounded">${isCompleted ? 'check_circle' : 'radio_button_unchecked'}</span>
              </button>
              <button type="button" class="notice-action-btn notice-like-btn ${likedByMe ? 'is-liked' : ''}" data-action="like" data-id="${sanitizeHtml(note.id)}" aria-label="Heart note">
                <span class="material-symbols-rounded">${likedByMe ? 'favorite' : 'favorite_border'}</span>
                <span class="notice-like-count">${likesCount > 0 ? likesCount : ''}</span>
              </button>
              ${isList ? `
                <button type="button" class="btn-action btn-edit notice-edit-btn list-edit-btn" data-action="edit-list" data-id="${sanitizeHtml(note.id)}" aria-label="Edit list" title="Edit list">
                  <span class="material-symbols-rounded">edit</span>
                </button>
              ` : (isAuthor ? `
                <button type="button" class="btn-action btn-edit notice-edit-btn note-edit-btn" data-action="edit-note" data-id="${sanitizeHtml(note.id)}" aria-label="Edit note" title="Edit note">
                  <span class="material-symbols-rounded">edit</span>
                </button>
              ` : '')}
              ${isAuthor ? `
                <button type="button" class="btn-action btn-delete notice-delete-btn" data-action="delete" data-id="${sanitizeHtml(note.id)}" aria-label="${isList ? 'Delete list' : 'Delete note'}" title="Delete">
                  <span class="material-symbols-rounded">delete</span>
                </button>
              ` : ''}
            </div>
          </footer>
        </article>
      `;
    }).join('');
  }

  function updateCategoryGroupsVisibility(cat) {
    const reminderGroup = document.getElementById('notice-reminder-time-group');
    const recipientGroup = document.getElementById('notice-recipient-group');
    const expiryGroup = document.getElementById('notice-expiry-group');

    if (reminderGroup) {
      if (cat === 'Reminder') reminderGroup.classList.remove('hidden');
      else reminderGroup.classList.add('hidden');
    }
    if (recipientGroup) {
      if (cat === 'Love') recipientGroup.classList.remove('hidden');
      else recipientGroup.classList.add('hidden');
    }
    if (expiryGroup) {
      if (cat === 'Note') expiryGroup.classList.remove('hidden');
      else expiryGroup.classList.add('hidden');
    }
  }

  function openNoteModal(noteToEdit) {
    const modal = document.getElementById('notice-modal-backdrop');
    const form = document.getElementById('notice-form');
    const titleEl = document.getElementById('notice-modal-title');
    const submitBtn = document.getElementById('notice-submit-btn');
    const authorSelect = document.getElementById('notice-author');
    const textInput = document.getElementById('notice-text');
    const categorySelect = document.getElementById('notice-category');
    const pinnedCheckbox = document.getElementById('notice-pinned');
    const editIdInput = document.getElementById('notice-edit-id');
    const linkSelect = document.getElementById('notice-linked-list');
    const reminderTimeInput = document.getElementById('notice-reminder-time');
    const recipientSelect = document.getElementById('notice-recipient');
    const expirySelect = document.getElementById('notice-expiry');
    if (!modal) return;

    if (form) form.reset();

    const availableLists = currentNotes.filter(n => n.type === 'list');
    if (linkSelect) {
      linkSelect.innerHTML = '<option value="">None (Standalone Note)</option>' +
        availableLists.map(l => `<option value="${l.id}">📋 ${sanitizeHtml(l.title || 'Checklist')}</option>`).join('');
    }

    if (noteToEdit && noteToEdit.id) {
      if (titleEl) titleEl.textContent = 'Edit Note';
      if (submitBtn) submitBtn.textContent = 'Save Changes';
      if (editIdInput) editIdInput.value = noteToEdit.id;
      if (textInput) textInput.value = noteToEdit.text || '';
      if (categorySelect) categorySelect.value = noteToEdit.category || 'Note';
      if (authorSelect) authorSelect.value = noteToEdit.author || getActiveUser();
      if (pinnedCheckbox) pinnedCheckbox.checked = Boolean(noteToEdit.pinned);
      if (linkSelect) linkSelect.value = noteToEdit.linkedListId || '';
      if (reminderTimeInput) reminderTimeInput.value = noteToEdit.reminderTime || '';
      if (recipientSelect) recipientSelect.value = noteToEdit.recipient || '';
      if (expirySelect) expirySelect.value = noteToEdit.expiryHours || '';
      updateCategoryGroupsVisibility(noteToEdit.category || 'Note');
    } else {
      if (titleEl) titleEl.textContent = 'Pin a Note';
      if (submitBtn) submitBtn.textContent = 'Pin Note';
      if (editIdInput) editIdInput.value = '';
      if (authorSelect) authorSelect.value = getActiveUser();
      if (categorySelect) categorySelect.value = 'Note';
      if (reminderTimeInput) reminderTimeInput.value = '';
      if (recipientSelect) recipientSelect.value = '';
      if (expirySelect) expirySelect.value = '';
      updateCategoryGroupsVisibility('Note');
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    if (textInput) {
      setTimeout(() => textInput.focus(), 100);
    }
  }

  function closeNoteModal() {
    const modal = document.getElementById('notice-modal-backdrop');
    const titleEl = document.getElementById('notice-modal-title');
    const submitBtn = document.getElementById('notice-submit-btn');
    const editIdInput = document.getElementById('notice-edit-id');
    const reminderTimeInput = document.getElementById('notice-reminder-time');
    const recipientSelect = document.getElementById('notice-recipient');
    const expirySelect = document.getElementById('notice-expiry');
    if (!modal) return;
    if (titleEl) titleEl.textContent = 'Pin a Note';
    if (submitBtn) submitBtn.textContent = 'Pin Note';
    if (editIdInput) editIdInput.value = '';
    if (reminderTimeInput) reminderTimeInput.value = '';
    if (recipientSelect) recipientSelect.value = '';
    if (expirySelect) expirySelect.value = '';
    updateCategoryGroupsVisibility('Note');
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
    const linkSelect = document.getElementById('notice-linked-list');
    const submitBtn = document.getElementById('notice-submit-btn');

    const text = textInput ? textInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'Note';
    const author = authorSelect ? authorSelect.value : getActiveUser();
    const pinned = pinnedCheckbox ? pinnedCheckbox.checked : false;
    const linkedListId = linkSelect ? linkSelect.value : '';

    const editIdInput = document.getElementById('notice-edit-id');
    const editId = editIdInput ? editIdInput.value.trim() : '';

    const reminderTimeInput = document.getElementById('notice-reminder-time');
    const reminderTime = (category === 'Reminder' && reminderTimeInput && reminderTimeInput.value)
      ? reminderTimeInput.value
      : null;

    const recipientSelect = document.getElementById('notice-recipient');
    const expirySelect = document.getElementById('notice-expiry');
    const recipient = (category === 'Love' && recipientSelect) ? recipientSelect.value : null;
    const expiryHours = (category === 'Note' && expirySelect) ? expirySelect.value : null;

    if (!text) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = editId ? 'Saving...' : 'Pinning...';
    }

    try {
      if (editId) {
        await db.collection('noticeboard_notes').doc(editId).update({
          text,
          category,
          author,
          pinned,
          reminderTime,
          recipient,
          expiryHours,
          reminded: false,
          linkedListId: linkedListId || null
        });

        if (linkedListId) {
          db.collection('noticeboard_notes').doc(linkedListId).update({
            linkedNoteId: editId
          }).catch(err => console.warn('Failed to update bidirectional list link:', err));
        }
      } else {
        const docRef = await db.collection('noticeboard_notes').add({
          type: 'note',
          text,
          category,
          author,
          pinned,
          reminderTime,
          recipient,
          expiryHours,
          acknowledgedBy: [],
          reminded: false,
          linkedListId: linkedListId || null,
          likes: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (linkedListId) {
          db.collection('noticeboard_notes').doc(linkedListId).update({
            linkedNoteId: docRef.id
          }).catch(err => console.warn('Failed to update bidirectional list link:', err));
        }

        const senderToken = localStorage.getItem('famcal_fcm_token') || null;
        const notePreview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
        let notifTitle = `New Note from ${author}`;
        if (category === 'Urgent') notifTitle = `🚨 URGENT: ${author} posted an alert!`;
        else if (category === 'Love') notifTitle = recipient ? `❤️ Note for ${recipient} from ${author}` : `❤️ Love Note from ${author}`;
        else if (category === 'Shoutout') notifTitle = `🎉 Shoutout from ${author}!`;
        else if (category === 'Reminder' && reminderTime) notifTitle = `⏰ Reminder from ${author}`;

        const remindDetail = (category === 'Reminder' && reminderTime) ? ` (Set for ${formatReminderDateTime(reminderTime)})` : '';

        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notifTitle,
            body: `${notePreview}${remindDetail}`,
            sender: author,
            senderToken,
            url: '/#noticeboard'
          })
        }).catch((err) => console.warn('Note notification error:', err));
      }

      closeNoteModal();
    } catch (err) {
      console.error('Error saving notice:', err);
      alert('Could not save notice: ' + (err.message || 'Unknown error'));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = editId ? 'Save Changes' : 'Pin Note';
      }
    }
  }

  async function handleCardAction(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn || !db) return;
    const action = btn.dataset.action;
    const noteId = btn.dataset.id;
    if (!action || !noteId) return;

    if (action === 'edit-note') {
      const note = currentNotes.find(n => n.id === noteId);
      if (note) openNoteModal(note);
      return;
    }

    if (action === 'toggle-complete') {
      const note = currentNotes.find(n => n.id === noteId);
      const isCompleted = note ? Boolean(note.completed) : false;
      try {
        await db.collection('noticeboard_notes').doc(noteId).update({
          completed: !isCompleted,
          completedAt: !isCompleted ? firebase.firestore.FieldValue.serverTimestamp() : null,
          completedBy: !isCompleted ? getActiveUser() : null
        });
      } catch (err) {
        console.error('Failed to toggle completion:', err);
      }
      return;
    }

    if (action === 'acknowledge') {
      if (window.FamCalCategoryEnhancements) {
        await window.FamCalCategoryEnhancements.toggleAcknowledge(noteId, db, getActiveUser());
      }
      return;
    }

    if (action === 'like') {
      const currentProfile = getActiveUser();
      const noteRef = db.collection('noticeboard_notes').doc(noteId);
      const isLiked = btn.classList.contains('is-liked');
      const note = currentNotes.find(n => n.id === noteId);

      try {
        if (isLiked) {
          await noteRef.update({
            likes: firebase.firestore.FieldValue.arrayRemove(currentProfile)
          });
        } else {
          await noteRef.update({
            likes: firebase.firestore.FieldValue.arrayUnion(currentProfile)
          });

          if (note && window.FamCalCategoryEnhancements) {
            if (note.category === 'Shoutout') {
              window.FamCalCategoryEnhancements.triggerConfetti();
            } else if (note.category === 'Love') {
              window.FamCalCategoryEnhancements.triggerFloatingHearts(btn.getBoundingClientRect());
            }
          }
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

  window.addEventListener('famcal-tab-changed', (e) => {
    if (e.detail && e.detail.tab === 'noticeboard') {
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      const badge = document.getElementById('noticeboard-badge');
      if (badge) badge.classList.add('hidden');
    }
  });

  const scheduledReminderTimers = new Map();

  function triggerReminderAlert(note) {
    const key = `notified_reminder_${note.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, 'true');

    if (window.FamCalNotifications && typeof window.FamCalNotifications.showNotification === 'function') {
      window.FamCalNotifications.showNotification(`⏰ Reminder: ${note.author}`, {
        body: note.text,
        tag: `reminder-${note.id}`,
        data: '/#noticeboard'
      });
    }

    if (db) {
      db.collection('noticeboard_notes').doc(note.id).update({
        reminded: true
      }).catch(() => {});
    }
  }

  function evaluateScheduledReminders(notes) {
    const now = Date.now();
    notes.forEach((note) => {
      if (note.type !== 'note' || note.category !== 'Reminder' || !note.reminderTime || note.reminded) return;

      const targetTime = new Date(note.reminderTime).getTime();
      if (isNaN(targetTime)) return;
      const diffMs = targetTime - now;
      const timerKey = `reminder_${note.id}_${targetTime}`;

      if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
        if (!scheduledReminderTimers.has(timerKey)) {
          const tId = setTimeout(() => {
            scheduledReminderTimers.delete(timerKey);
            triggerReminderAlert(note);
          }, diffMs);
          scheduledReminderTimers.set(timerKey, tId);
        }
      } else if (diffMs <= 0 && diffMs >= -10 * 60 * 1000) {
        triggerReminderAlert(note);
      }
    });
  }

  async function initFirestore() {
    try {
      if (typeof window.FamCalGetFirebase === 'function') {
        const fb = await window.FamCalGetFirebase();
        db = fb.db;
      } else if (typeof firebase !== 'undefined' && firebase.firestore) {
        db = firebase.firestore();
      }
    } catch (err) {
      console.warn('Firebase init error in Noticeboard:', err);
    }

    if (!db) {
      console.warn('Firestore database unavailable.');
      return;
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
        evaluateScheduledReminders(currentNotes);
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

  function setupDomEvents() {
    const grid = document.getElementById('noticeboard-grid');
    if (grid) {
      grid.addEventListener('click', handleCardAction);
    }

    const form = document.getElementById('notice-form');
    if (form) {
      form.addEventListener('submit', handleAddNote);
    }

    const categorySelect = document.getElementById('notice-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        updateCategoryGroupsVisibility(categorySelect.value);
      });
    }

    const menu = document.getElementById('notice-dropdown-menu');
    const wrapper = document.getElementById('notice-menu-wrapper');
    const triggerBtn = document.getElementById('notice-menu-trigger-btn');

    function closeNoticeMenu() {
      if (menu) menu.classList.add('hidden');
      if (wrapper) wrapper.classList.remove('is-open');
      if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleNoticeMenu() {
      if (!menu) return;
      const isHidden = menu.classList.contains('hidden');
      if (isHidden) {
        menu.classList.remove('hidden');
        if (wrapper) wrapper.classList.add('is-open');
        if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'true');
      } else {
        closeNoticeMenu();
      }
    }

    if (triggerBtn) {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNoticeMenu();
      });
    }

    document.addEventListener('click', (e) => {
      if (wrapper && !wrapper.contains(e.target)) {
        closeNoticeMenu();
      }
    });

    const openModalBtn = document.getElementById('open-notice-modal-btn');
    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => {
        closeNoticeMenu();
        openNoteModal();
      });
    }

    const openListBtn = document.getElementById('open-list-modal-btn');
    if (openListBtn) {
      openListBtn.addEventListener('click', () => {
        closeNoticeMenu();
      });
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

    window.addEventListener('famcal-firebase-ready', (e) => {
      if (e.detail && e.detail.db) {
        db = e.detail.db;
        initFirestore();
      }
    });
  }

  function init() {
    setupDomEvents();
    renderNotes([]);
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

  window.FamCalGetNotes = () => currentNotes;
})();
