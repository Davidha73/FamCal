// JustUs - Help & User Guide Module
(function () {
  'use strict';

  function openHelpModal() {
    const backdrop = document.getElementById('help-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // If settings drawer is open, we can keep it open in the background or leave as-is
    const modalContent = backdrop.querySelector('.help-modal-scrollable');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  }

  function closeHelpModal() {
    const backdrop = document.getElementById('help-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function setupDomEvents() {
    const helpBtn = document.getElementById('open-help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', openHelpModal);
    }

    const drawerRowBtn = document.getElementById('drawer-help-row-btn');
    if (drawerRowBtn) {
      drawerRowBtn.addEventListener('click', openHelpModal);
    }

    const closeBtn = document.getElementById('close-help-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeHelpModal);
    }

    const backdrop = document.getElementById('help-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeHelpModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const bd = document.getElementById('help-modal-backdrop');
        if (bd && !bd.classList.contains('hidden')) {
          closeHelpModal();
        }
      }
    });
  }

  function init() {
    setupDomEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FamCalOpenHelpModal = openHelpModal;
  window.FamCalCloseHelpModal = closeHelpModal;
})();
