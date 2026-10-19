(function() {
  'use strict';

  const TABS = [
    {
      id: 'calendar',
      label: 'Calendar',
      icon: 'calendar_month',
      viewId: 'calendar-view-container',
      badgeId: null
    },
    {
      id: 'noticeboard',
      label: 'Noticeboard',
      icon: 'sticky_note_2',
      viewId: 'noticeboard-view-container',
      badgeId: 'noticeboard-badge'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: 'forum',
      viewId: 'messages-view-container',
      badgeId: 'messages-badge'
    }
  ];

  const STORAGE_KEY = 'famcal-active-tab';

  function renderNavbar() {
    let existingNav = document.getElementById('app-bottom-nav');
    if (!existingNav) {
      existingNav = document.createElement('nav');
      existingNav.id = 'app-bottom-nav';
      existingNav.className = 'bottom-nav-bar';
      existingNav.setAttribute('aria-label', 'Main Navigation');

      existingNav.innerHTML = TABS.map(tab => {
        const badgeHtml = tab.badgeId
          ? `<span id="${tab.badgeId}" class="bottom-nav-badge hidden">0</span>`
          : '';
        return `
          <button type="button" id="tab-nav-${tab.id}" class="bottom-nav-item" role="tab" aria-selected="false" data-tab="${tab.id}">
            <span class="bottom-nav-icon-wrapper">
              <span class="material-symbols-rounded bottom-nav-icon">${tab.icon}</span>
              ${badgeHtml}
            </span>
            <span class="bottom-nav-label">${tab.label}</span>
          </button>
        `;
      }).join('');

      document.body.appendChild(existingNav);
    }
    return existingNav;
  }

  function switchTab(targetTabId) {
    const validTab = TABS.some(t => t.id === targetTabId) ? targetTabId : 'calendar';

    TABS.forEach(tab => {
      const isActive = tab.id === validTab;
      const btn = document.getElementById(`tab-nav-${tab.id}`);
      const view = document.getElementById(tab.viewId);

      if (btn) {
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }

      if (view) {
        view.classList.toggle('hidden', !isActive);
      }
    });

    try {
      localStorage.setItem(STORAGE_KEY, validTab);
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('famcal-tab-changed', { detail: { tab: validTab } }));
  }

  function updateBadge(tabId, count) {
    const tab = TABS.find(t => t.id === tabId);
    if (!tab || !tab.badgeId) return;

    const badge = document.getElementById(tab.badgeId);
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function init() {
    renderNavbar();

    TABS.forEach(tab => {
      const btn = document.getElementById(`tab-nav-${tab.id}`);
      if (btn) {
        btn.addEventListener('click', () => switchTab(tab.id));
      }
    });

    const initialTab = localStorage.getItem(STORAGE_KEY) || 'calendar';
    switchTab(initialTab);
    setupKeyboardHandling();
  }

  function setupKeyboardHandling() {
    function isEditable(el) {
      if (!el) return false;
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    }

    document.addEventListener('focusin', (e) => {
      if (isEditable(e.target)) {
        document.body.classList.add('keyboard-open');
      }
    });

    document.addEventListener('focusout', (e) => {
      if (isEditable(e.target)) {
        setTimeout(() => {
          const active = document.activeElement;
          if (!isEditable(active)) {
            document.body.classList.remove('keyboard-open');
          }
        }, 120);
      }
    });

    if (window.visualViewport) {
      const onViewportChange = () => {
        const isShrunk = window.visualViewport.height < window.innerHeight - 120;
        const active = document.activeElement;
        if (isShrunk && isEditable(active)) {
          document.body.classList.add('keyboard-open');
        } else if (!isShrunk && !isEditable(active)) {
          document.body.classList.remove('keyboard-open');
        }
      };

      window.visualViewport.addEventListener('resize', onViewportChange);
      window.visualViewport.addEventListener('scroll', onViewportChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FamCalNavigation = {
    switchTab,
    updateBadge,
    getActiveTab: () => localStorage.getItem(STORAGE_KEY) || 'calendar'
  };

  window.FamCalSwitchTab = switchTab;
})();
