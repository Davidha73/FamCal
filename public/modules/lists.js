(function() {
  'use strict';

  let db = null;
  const collapsedLists = new Set(JSON.parse(localStorage.getItem('famcal-collapsed-lists') || '[]'));

  async function getDb() {
    if (db) return db;
    try {
      if (typeof window.FamCalGetFirebase === 'function') {
        const fb = await window.FamCalGetFirebase();
        db = fb.db;
      } else if (typeof firebase !== 'undefined' && firebase.firestore) {
        db = firebase.firestore();
      }
    } catch (err) {
      console.warn('Firebase init in Lists module:', err);
    }
    return db;
  }

  function getActiveUser() {
    try {
      return localStorage.getItem('famcal-active-user') || 'Dad';
    } catch (_) {
      return 'Dad';
    }
  }

  function sanitizeHtml(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  function addItemInputRow(container, initialText = '', initialDone = false, initialId = null) {
    const row = document.createElement('div');
    row.className = 'list-modal-item-row';
    const itemId = initialId || ('item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    row.dataset.itemId = itemId;
    row.dataset.itemDone = initialDone ? 'true' : 'false';

    row.innerHTML = `
      <span class="material-symbols-rounded list-modal-drag-icon">drag_indicator</span>
      <input type="text" class="form-input list-modal-item-input" placeholder="List item..." value="${sanitizeHtml(initialText)}" required>
      <button type="button" class="icon-button icon-button-ghost list-modal-remove-item-btn" aria-label="Remove item">
        <span class="material-symbols-rounded">close</span>
      </button>
    `;

    const removeBtn = row.querySelector('.list-modal-remove-item-btn');
    removeBtn.addEventListener('click', () => {
      const allRows = container.querySelectorAll('.list-modal-item-row');
      if (allRows.length > 1) {
        row.remove();
      } else {
        const inp = row.querySelector('.list-modal-item-input');
        if (inp) inp.value = '';
      }
    });

    const input = row.querySelector('.list-modal-item-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newRow = addItemInputRow(container);
        newRow.querySelector('.list-modal-item-input').focus();
      }
    });

    container.appendChild(row);
    return row;
  }

  function openListModal() {
    const modal = document.getElementById('list-modal-backdrop');
    const form = document.getElementById('list-form');
    const editIdInput = document.getElementById('list-edit-id');
    const titleEl = document.getElementById('list-modal-title');
    const submitBtn = document.getElementById('list-submit-btn');
    const authorSelect = document.getElementById('list-author');
    const itemsContainer = document.getElementById('list-items-container');
    const linkSelect = document.getElementById('list-linked-note');

    if (!modal) return;
    if (form) form.reset();
    if (editIdInput) editIdInput.value = '';
    if (titleEl) titleEl.textContent = 'Pin a List';
    if (submitBtn) submitBtn.textContent = 'Pin List';
    if (authorSelect) authorSelect.value = getActiveUser();

    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      addItemInputRow(itemsContainer);
      addItemInputRow(itemsContainer);
    }

    if (linkSelect && typeof window.FamCalGetNotes === 'function') {
      const notes = window.FamCalGetNotes().filter(n => n.type !== 'list');
      linkSelect.innerHTML = '<option value="">None (Standalone List)</option>' +
        notes.map(n => `<option value="${n.id}">📝 ${sanitizeHtml(n.text ? n.text.slice(0, 35) + '...' : 'Note')}</option>`).join('');
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    const titleInput = document.getElementById('list-title');
    if (titleInput) setTimeout(() => titleInput.focus(), 100);
  }

  function editList(listId) {
    const modal = document.getElementById('list-modal-backdrop');
    const form = document.getElementById('list-form');
    const editIdInput = document.getElementById('list-edit-id');
    const titleEl = document.getElementById('list-modal-title');
    const submitBtn = document.getElementById('list-submit-btn');
    const titleInput = document.getElementById('list-title');
    const categorySelect = document.getElementById('list-category');
    const authorSelect = document.getElementById('list-author');
    const pinnedCheckbox = document.getElementById('list-pinned');
    const itemsContainer = document.getElementById('list-items-container');
    const linkSelect = document.getElementById('list-linked-note');

    if (!modal) return;

    const notes = typeof window.FamCalGetNotes === 'function' ? window.FamCalGetNotes() : [];
    const list = notes.find(n => n.id === listId);
    if (!list) return;

    if (form) form.reset();
    if (editIdInput) editIdInput.value = list.id;
    if (titleEl) titleEl.textContent = 'Edit List';
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    if (titleInput) titleInput.value = list.title || '';
    if (categorySelect) categorySelect.value = list.category || 'Note';
    if (authorSelect) authorSelect.value = list.author || getActiveUser();
    if (pinnedCheckbox) pinnedCheckbox.checked = Boolean(list.pinned);

    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      const items = Array.isArray(list.items) && list.items.length > 0 ? list.items : [{ text: '', done: false }];
      items.forEach(it => {
        addItemInputRow(itemsContainer, it.text || '', it.done || false, it.id || null);
      });
    }

    if (linkSelect) {
      const nonListNotes = notes.filter(n => n.type !== 'list');
      linkSelect.innerHTML = '<option value="">None (Standalone List)</option>' +
        nonListNotes.map(n => `<option value="${n.id}">📝 ${sanitizeHtml(n.text ? n.text.slice(0, 35) + '...' : 'Note')}</option>`).join('');
      linkSelect.value = list.linkedNoteId || '';
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    if (titleInput) setTimeout(() => titleInput.focus(), 100);
  }

  function closeListModal() {
    const modal = document.getElementById('list-modal-backdrop');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function handleAddList(e) {
    e.preventDefault();
    const database = await getDb();
    if (!database) {
      alert('Firebase connection is not ready. Please try again.');
      return;
    }

    const editIdInput = document.getElementById('list-edit-id');
    const editId = editIdInput ? editIdInput.value.trim() : '';

    const titleInput = document.getElementById('list-title');
    const categorySelect = document.getElementById('list-category');
    const authorSelect = document.getElementById('list-author');
    const pinnedCheckbox = document.getElementById('list-pinned');
    const linkSelect = document.getElementById('list-linked-note');
    const submitBtn = document.getElementById('list-submit-btn');

    const title = titleInput ? titleInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'Note';
    const author = authorSelect ? authorSelect.value : getActiveUser();
    const pinned = pinnedCheckbox ? pinnedCheckbox.checked : false;
    const linkedNoteId = linkSelect ? linkSelect.value : '';

    const rows = document.querySelectorAll('.list-modal-item-row');
    const items = [];
    rows.forEach((row, idx) => {
      const inp = row.querySelector('.list-modal-item-input');
      const val = inp ? inp.value.trim() : '';
      if (val) {
        items.push({
          id: row.dataset.itemId || ('item_' + Date.now() + '_' + idx),
          text: val,
          done: row.dataset.itemDone === 'true'
        });
      }
    });

    if (!title) {
      alert('Please enter a list title.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item to the list.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = editId ? 'Saving...' : 'Pinning...';
    }

    try {
      if (editId) {
        await database.collection('noticeboard_notes').doc(editId).update({
          title,
          items,
          category,
          author,
          pinned,
          linkedNoteId: linkedNoteId || null
        });

        if (linkedNoteId) {
          database.collection('noticeboard_notes').doc(linkedNoteId).update({
            linkedListId: editId
          }).catch(() => {});
        }
      } else {
        const docRef = await database.collection('noticeboard_notes').add({
          type: 'list',
          title,
          items,
          category,
          author,
          pinned,
          linkedNoteId: linkedNoteId || null,
          likes: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (linkedNoteId) {
          database.collection('noticeboard_notes').doc(linkedNoteId).update({
            linkedListId: docRef.id
          }).catch(err => console.warn('Failed to update bidirectional note link:', err));
        }

        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${author} pinned a list: ${title}`,
            body: `${items.length} items to check out!`,
            sender: author
          })
        }).catch(() => {});
      }

      closeListModal();
    } catch (err) {
      console.error('Error saving list:', err);
      alert('Could not save list: ' + (err.message || 'Unknown error'));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = editId ? 'Save Changes' : 'Pin List';
      }
    }
  }

  async function toggleListItem(listId, itemId, isChecked) {
    const database = await getDb();
    if (!database) return;

    try {
      const docRef = database.collection('noticeboard_notes').doc(listId);
      const doc = await docRef.get();
      if (!doc.exists) return;

      const data = doc.data();
      const items = (data.items || []).map(item => {
        if (item.id === itemId) {
          return { ...item, done: isChecked };
        }
        return item;
      });

      await docRef.update({ items });
    } catch (err) {
      console.error('Failed to toggle list item:', err);
    }
  }

  function toggleCollapse(listId) {
    if (!listId) return;
    const card = document.querySelector(`article[data-note-id="${listId}"]`);
    if (!card) return;

    const isCollapsed = card.classList.toggle('is-collapsed');
    const collapsibleBody = card.querySelector('.list-collapsible-body');
    if (collapsibleBody) {
      collapsibleBody.classList.toggle('is-collapsed', isCollapsed);
    }
    const chevron = card.querySelector('.list-collapse-btn .material-symbols-rounded');
    if (chevron) {
      chevron.textContent = isCollapsed ? 'expand_more' : 'expand_less';
    }
    const btn = card.querySelector('.list-collapse-btn');
    if (btn) {
      btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      btn.setAttribute('title', isCollapsed ? 'Expand list' : 'Collapse list');
    }

    if (isCollapsed) {
      collapsedLists.add(listId);
    } else {
      collapsedLists.delete(listId);
    }

    try {
      localStorage.setItem('famcal-collapsed-lists', JSON.stringify(Array.from(collapsedLists)));
    } catch (_) {}
  }

  function scrollAndHighlight(targetId) {
    if (!targetId) return;
    const card = document.querySelector(`article[data-note-id="${targetId}"]`);
    if (!card) return;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('is-highlighted');
    void card.offsetWidth;
    card.classList.add('is-highlighted');
    setTimeout(() => {
      card.classList.remove('is-highlighted');
    }, 2200);
  }

  function setupDomEvents() {
    const openBtn = document.getElementById('open-list-modal-btn');
    if (openBtn) openBtn.addEventListener('click', openListModal);

    const closeBtn = document.getElementById('list-modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeListModal);

    const cancelBtn = document.getElementById('list-modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeListModal);

    const backdrop = document.getElementById('list-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeListModal();
      });
    }

    const form = document.getElementById('list-form');
    if (form) form.addEventListener('submit', handleAddList);

    const addItemBtn = document.getElementById('list-add-item-btn');
    if (addItemBtn) {
      addItemBtn.addEventListener('click', () => {
        const container = document.getElementById('list-items-container');
        if (container) {
          const row = addItemInputRow(container);
          row.querySelector('.list-modal-item-input').focus();
        }
      });
    }

    const grid = document.getElementById('noticeboard-grid');
    if (grid) {
      grid.addEventListener('change', (e) => {
        const checkbox = e.target.closest('.list-checkbox-input');
        if (!checkbox) return;
        const listId = checkbox.dataset.listId;
        const itemId = checkbox.dataset.itemId;
        if (listId && itemId) {
          toggleListItem(listId, itemId, checkbox.checked);
        }
      });

      grid.addEventListener('click', (e) => {
        const collapseTrigger = e.target.closest('.list-collapse-btn') || e.target.closest('.list-title-left');
        if (collapseTrigger) {
          const listCard = collapseTrigger.closest('.notice-card');
          const listId = listCard ? listCard.dataset.noteId : collapseTrigger.dataset.listId;
          toggleCollapse(listId);
          return;
        }

        const editBtn = e.target.closest('.list-edit-btn');
        if (editBtn) {
          const listId = editBtn.dataset.id;
          editList(listId);
          return;
        }

        const pill = e.target.closest('.notice-linked-pill');
        if (pill) {
          const targetId = pill.dataset.scrollTo;
          if (targetId) {
            scrollAndHighlight(targetId);
          }
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDomEvents);
  } else {
    setupDomEvents();
  }

  window.FamCalLists = {
    openListModal,
    editList,
    closeListModal,
    toggleCollapse,
    scrollAndHighlight,
    toggleListItem
  };
})();
