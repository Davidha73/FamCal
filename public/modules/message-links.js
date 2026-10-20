// JustUs - Message Links & Slash Command Converter Module
(function () {
  'use strict';

  const SLASH_COMMANDS = [
    { cmd: '/note', label: 'Pin as Note', icon: 'sticky_note_2', desc: 'Create a pinned notice from text' },
    { cmd: '/list', label: 'Pin as List', icon: 'checklist', desc: 'Create a checklist from text' },
    { cmd: '/event', label: 'Add Event', icon: 'calendar_month', desc: 'Create a calendar event' },
    { cmd: '/link', label: 'Link Note or List', icon: 'link', desc: 'Attach a note or list to this message' }
  ];

  let pendingAttachment = null;

  function setPendingAttachment(attachment) {
    pendingAttachment = attachment;
    renderAttachmentBadge();
  }

  function getPendingAttachment() {
    return pendingAttachment;
  }

  function clearPendingAttachment() {
    pendingAttachment = null;
    renderAttachmentBadge();
  }

  function renderAttachmentBadge() {
    let badgeContainer = document.getElementById('messages-attachment-badge');
    const form = document.getElementById('messages-compose-form');
    if (!form) return;

    if (!pendingAttachment) {
      if (badgeContainer) badgeContainer.remove();
      return;
    }

    if (!badgeContainer) {
      badgeContainer = document.createElement('div');
      badgeContainer.id = 'messages-attachment-badge';
      badgeContainer.className = 'messages-attachment-preview';
      form.parentNode.insertBefore(badgeContainer, form);
    }

    const icon = pendingAttachment.type === 'list' ? 'checklist' : 'sticky_note_2';
    const title = pendingAttachment.title || (pendingAttachment.text ? pendingAttachment.text.slice(0, 30) : 'Item');

    badgeContainer.innerHTML = `
      <span class="material-symbols-rounded">${icon}</span>
      <span class="attachment-text">Linking: ${sanitizeHtml(title)}</span>
      <button type="button" class="attachment-remove-btn" id="remove-attachment-btn" aria-label="Remove attachment">
        <span class="material-symbols-rounded">close</span>
      </button>
    `;

    const removeBtn = document.getElementById('remove-attachment-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', clearPendingAttachment);
    }
  }

  function sanitizeHtml(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  function copyToNote(text, imageUrl = null) {
    if (typeof window.FamCalSwitchTab === 'function') {
      window.FamCalSwitchTab('noticeboard');
    }
    setTimeout(() => {
      if (typeof window.FamCalOpenNoteModal === 'function') {
        window.FamCalOpenNoteModal({ text: text || '', imageUrl: imageUrl || null });
      }
    }, 120);
  }

  function copyToList(text) {
    if (typeof window.FamCalSwitchTab === 'function') {
      window.FamCalSwitchTab('noticeboard');
    }
    setTimeout(() => {
      if (window.FamCalLists && typeof window.FamCalLists.openListModal === 'function') {
        window.FamCalLists.openListModal({ title: text || '' });
      }
    }, 120);
  }

  function copyToEvent(text) {
    if (typeof window.FamCalSwitchTab === 'function') {
      window.FamCalSwitchTab('calendar');
    }
    setTimeout(() => {
      if (typeof window.FamCalOpenEventForm === 'function') {
        window.FamCalOpenEventForm({ summary: text || '' });
      }
    }, 120);
  }

  function openConvertMenu(msg, triggerBtn) {
    const existing = document.getElementById('message-convert-popover');
    if (existing) existing.remove();

    const popover = document.createElement('div');
    popover.id = 'message-convert-popover';
    popover.className = 'message-convert-popover';
    popover.setAttribute('role', 'menu');

    popover.innerHTML = `
      <div class="popover-header">Copy message to:</div>
      <button type="button" class="popover-item" data-convert="note">
        <span class="material-symbols-rounded">sticky_note_2</span>
        <span>Pin to Note</span>
      </button>
      <button type="button" class="popover-item" data-convert="list">
        <span class="material-symbols-rounded">checklist</span>
        <span>Pin to List</span>
      </button>
      <button type="button" class="popover-item" data-convert="event">
        <span class="material-symbols-rounded">calendar_month</span>
        <span>Add to Calendar</span>
      </button>
    `;

    document.body.appendChild(popover);

    const rect = triggerBtn.getBoundingClientRect();
    popover.style.top = `${Math.min(window.innerHeight - 170, rect.bottom + 4)}px`;
    popover.style.left = `${Math.max(12, Math.min(window.innerWidth - 210, rect.left - 130))}px`;

    function onAction(e) {
      const btn = e.target.closest('button[data-convert]');
      if (!btn) return;
      const type = btn.dataset.convert;
      const text = msg.text || '';
      const imageUrl = msg.imageUrl || null;
      closePopover();

      if (type === 'note') copyToNote(text, imageUrl);
      else if (type === 'list') copyToList(text);
      else if (type === 'event') copyToEvent(text);
    }

    function closePopover() {
      popover.remove();
      document.removeEventListener('click', onOutside);
    }

    function onOutside(e) {
      if (!popover.contains(e.target) && e.target !== triggerBtn) {
        closePopover();
      }
    }

    popover.addEventListener('click', onAction);
    setTimeout(() => document.addEventListener('click', onOutside), 20);
  }

  function openLinkPicker(onSelect) {
    const notes = typeof window.FamCalGetNotes === 'function' ? window.FamCalGetNotes() : [];
    const existing = document.getElementById('slash-link-picker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'slash-link-picker';
    picker.className = 'slash-link-picker';

    if (notes.length === 0) {
      picker.innerHTML = `
        <div class="link-picker-header">
          <span>Attach Note or List</span>
          <button type="button" class="icon-button icon-button-ghost link-picker-close"><span class="material-symbols-rounded">close</span></button>
        </div>
        <p class="link-picker-empty">No active notes or lists found to link.</p>
      `;
    } else {
      picker.innerHTML = `
        <div class="link-picker-header">
          <span>Select Note or List to link:</span>
          <button type="button" class="icon-button icon-button-ghost link-picker-close"><span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="link-picker-list">
          ${notes.map(n => {
            const isList = n.type === 'list';
            const icon = isList ? 'checklist' : 'sticky_note_2';
            const title = isList ? (n.title || 'Checklist') : (n.text ? n.text.slice(0, 40) + '...' : 'Note');
            return `
              <button type="button" class="link-picker-item" data-id="${sanitizeHtml(n.id)}" data-type="${isList ? 'list' : 'note'}" data-title="${sanitizeHtml(title)}">
                <span class="material-symbols-rounded">${icon}</span>
                <span class="link-picker-text">${sanitizeHtml(title)}</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    document.body.appendChild(picker);

    picker.querySelector('.link-picker-close')?.addEventListener('click', () => picker.remove());

    picker.addEventListener('click', (e) => {
      const itemBtn = e.target.closest('.link-picker-item');
      if (!itemBtn) return;
      const id = itemBtn.dataset.id;
      const type = itemBtn.dataset.type;
      const title = itemBtn.dataset.title;
      picker.remove();
      if (typeof onSelect === 'function') {
        onSelect({ id, type, title });
      }
    });
  }

  function attachSlashCommands(inputElement) {
    if (!inputElement || inputElement.dataset.slashAttached) return;
    inputElement.dataset.slashAttached = 'true';

    let menu = null;

    function ensureMenu() {
      if (menu) return menu;
      menu = document.createElement('div');
      menu.className = 'slash-commands-bar hidden';
      menu.setAttribute('role', 'listbox');
      document.body.appendChild(menu);
      return menu;
    }

    function hideMenu() {
      if (menu) {
        menu.classList.add('hidden');
        menu.innerHTML = '';
      }
    }

    function positionMenu() {
      if (!menu) return;
      const rect = inputElement.getBoundingClientRect();
      menu.style.left = `${Math.max(12, rect.left)}px`;
      menu.style.bottom = `${window.innerHeight - rect.top + 6}px`;
      menu.style.maxWidth = `${Math.min(380, rect.width)}px`;
    }

    function onInput() {
      const val = inputElement.value;
      if (!val.startsWith('/')) {
        hideMenu();
        return;
      }

      const query = val.split(' ')[0].toLowerCase();
      const filtered = SLASH_COMMANDS.filter(c => c.cmd.startsWith(query));

      if (filtered.length === 0) {
        hideMenu();
        return;
      }

      const sMenu = ensureMenu();
      sMenu.innerHTML = '';

      filtered.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slash-command-btn';
        btn.innerHTML = `
          <span class="material-symbols-rounded slash-icon">${c.icon}</span>
          <div class="slash-btn-info">
            <span class="slash-cmd-name">${c.cmd}</span>
            <span class="slash-cmd-desc">${c.desc}</span>
          </div>
        `;
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          executeSlashCommand(c.cmd);
        });
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          executeSlashCommand(c.cmd);
        }, { passive: false });
        sMenu.appendChild(btn);
      });

      positionMenu();
      sMenu.classList.remove('hidden');
    }

    function executeSlashCommand(cmd) {
      const fullText = inputElement.value.trim();
      const remainder = fullText.slice(cmd.length).trim();
      hideMenu();

      if (cmd === '/note') {
        inputElement.value = '';
        const photo = window.FamCalPhotos ? window.FamCalPhotos.getPendingPhoto() : null;
        copyToNote(remainder, photo ? photo.dataUrl : null);
        if (photo && window.FamCalPhotos) window.FamCalPhotos.clearPendingPhoto();
      } else if (cmd === '/list') {
        inputElement.value = '';
        copyToList(remainder);
      } else if (cmd === '/event') {
        inputElement.value = '';
        copyToEvent(remainder);
      } else if (cmd === '/link') {
        inputElement.value = remainder;
        openLinkPicker((item) => {
          setPendingAttachment(item);
        });
      }
    }

    inputElement.addEventListener('input', onInput);
    inputElement.addEventListener('blur', () => setTimeout(hideMenu, 250));
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideMenu();
      if (e.key === 'Enter' && inputElement.value.startsWith('/')) {
        const parts = inputElement.value.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const found = SLASH_COMMANDS.find(c => c.cmd === cmd);
        if (found) {
          e.preventDefault();
          executeSlashCommand(found.cmd);
        }
      }
    });
  }

  window.FamCalMessageLinks = {
    copyToNote,
    copyToList,
    copyToEvent,
    openConvertMenu,
    attachSlashCommands,
    openLinkPicker,
    getPendingAttachment,
    setPendingAttachment,
    clearPendingAttachment
  };
})();
