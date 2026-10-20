// JustUs - @Name Mentions & Quick Autocomplete Module
(function () {
  'use strict';

  const MEMBERS = [
    { name: 'Dad', key: 'dad', dotClass: 'dot-dad' },
    { name: 'Mum', key: 'mum', dotClass: 'dot-mum' },
    { name: 'Owen', key: 'owen', dotClass: 'dot-owen' },
    { name: 'Liv', key: 'liv', dotClass: 'dot-liv' }
  ];

  const MENTION_REGEX = /@(Dad|Mum|Owen|Liv|Olivia)\b/gi;

  function normalizeMemberName(name) {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower === 'olivia') return 'liv';
    return lower;
  }

  function formatMentions(text) {
    if (!text) return '';
    return text.replace(MENTION_REGEX, (match, memberName) => {
      const key = normalizeMemberName(memberName);
      const display = key === 'liv' && memberName.toLowerCase() === 'olivia' ? 'Olivia' : (memberName.charAt(0).toUpperCase() + memberName.slice(1).toLowerCase());
      return `<span class="mention-pill mention-${key}">@${display}</span>`;
    });
  }

  function extractMentions(text) {
    if (!text) return [];
    const matches = text.match(MENTION_REGEX);
    if (!matches) return [];
    const set = new Set();
    matches.forEach(m => {
      const name = m.slice(1);
      set.add(normalizeMemberName(name));
    });
    return Array.from(set);
  }

  function isUserMentioned(text, username) {
    if (!text || !username) return false;
    const mentions = extractMentions(text);
    return mentions.includes(normalizeMemberName(username));
  }

  function attachAutocomplete(inputElement) {
    if (!inputElement || inputElement.dataset.mentionAttached) return;
    inputElement.dataset.mentionAttached = 'true';

    let bar = null;

    function ensureBar() {
      if (bar) return bar;
      bar = document.createElement('div');
      bar.className = 'mention-suggestions-bar hidden';
      bar.setAttribute('role', 'listbox');
      bar.setAttribute('aria-label', 'Mention suggestions');
      document.body.appendChild(bar);
      return bar;
    }

    function hideBar() {
      if (bar) {
        bar.classList.add('hidden');
        bar.innerHTML = '';
      }
    }

    function positionBar() {
      if (!bar) return;
      const rect = inputElement.getBoundingClientRect();
      bar.style.left = `${Math.max(12, rect.left)}px`;
      bar.style.bottom = `${window.innerHeight - rect.top + 6}px`;
      bar.style.maxWidth = `${Math.min(320, rect.width)}px`;
    }

    function onInput() {
      const val = inputElement.value;
      const cursor = inputElement.selectionStart || 0;
      const textBefore = val.slice(0, cursor);
      const match = textBefore.match(/@([a-zA-Z]*)$/);

      if (!match) {
        hideBar();
        return;
      }

      const query = match[1].toLowerCase();
      const filtered = MEMBERS.filter(m => m.name.toLowerCase().startsWith(query));

      if (filtered.length === 0) {
        hideBar();
        return;
      }

      const sBar = ensureBar();
      sBar.innerHTML = '';

      filtered.forEach(m => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `mention-suggestion-btn mention-btn-${m.key}`;
        btn.innerHTML = `<span class="member-dot ${m.dotClass}"></span><span>@${m.name}</span>`;
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          applyMention(m.name, match[0].length);
        });
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          applyMention(m.name, match[0].length);
        }, { passive: false });
        sBar.appendChild(btn);
      });

      positionBar();
      sBar.classList.remove('hidden');
    }

    function applyMention(name, tokenLength) {
      const val = inputElement.value;
      const cursor = inputElement.selectionStart || 0;
      const before = val.slice(0, cursor - tokenLength);
      const after = val.slice(cursor);
      inputElement.value = `${before}@${name} ${after}`;
      const newPos = before.length + name.length + 2;
      inputElement.setSelectionRange(newPos, newPos);
      inputElement.focus();
      hideBar();
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }

    inputElement.addEventListener('input', onInput);
    inputElement.addEventListener('blur', () => setTimeout(hideBar, 200));
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideBar();
    });
  }

  window.FamCalMentions = {
    formatMentions,
    extractMentions,
    isUserMentioned,
    attachAutocomplete,
    MEMBERS
  };
})();
