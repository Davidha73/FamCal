// JustUs - Collapsible Mobile Calendar Scroll Module
(function () {
  'use strict';

  let isAutoCollapsed = false;
  let preferredMode = 'month';
  let touchStartY = 0;

  function init() {
    const calendarContainer = document.getElementById('calendar-view-container');
    const fixedContainer = document.getElementById('calendar-fixed-container');
    const calendarCard = document.querySelector('.calendar-card');
    const collapseHandle = document.getElementById('calendar-collapse-handle');

    if (!calendarContainer || !fixedContainer) return;

    window.addEventListener('famcal-view-changed', (e) => {
      if (e.detail && e.detail.manual) {
        preferredMode = e.detail.mode;
        isAutoCollapsed = false;
        if (e.detail.mode === 'week') {
          fixedContainer.classList.add('is-collapsed');
        } else {
          fixedContainer.classList.remove('is-collapsed');
        }
      }
    });

    window.addEventListener('scroll', () => {
      const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
      if (activeTab !== 'calendar') return;
      if (!window.FamCalCalendar) return;

      const currentMode = window.FamCalCalendar.getViewMode();
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

      if (scrollY > 45 && currentMode === 'month' && !isAutoCollapsed) {
        preferredMode = 'month';
        isAutoCollapsed = true;
        window.FamCalCalendar.setViewMode('week', false);
        fixedContainer.classList.add('is-collapsed');
      } else if (scrollY < 15 && isAutoCollapsed) {
        isAutoCollapsed = false;
        window.FamCalCalendar.setViewMode('month', false);
        fixedContainer.classList.remove('is-collapsed');
      }
    }, { passive: true });

    if (collapseHandle) {
      collapseHandle.addEventListener('click', () => {
        if (!window.FamCalCalendar) return;
        const currentMode = window.FamCalCalendar.getViewMode();
        const nextMode = currentMode === 'month' ? 'week' : 'month';
        isAutoCollapsed = false;
        window.FamCalCalendar.setViewMode(nextMode, true);
        if (nextMode === 'week') {
          fixedContainer.classList.add('is-collapsed');
        } else {
          fixedContainer.classList.remove('is-collapsed');
        }
      });
    }

    if (calendarCard) {
      calendarCard.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      calendarCard.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchEndY - touchStartY;
        if (!window.FamCalCalendar) return;

        if (diffY < -40) {
          if (window.FamCalCalendar.getViewMode() === 'month') {
            isAutoCollapsed = true;
            window.FamCalCalendar.setViewMode('week', false);
            fixedContainer.classList.add('is-collapsed');
          }
        } else if (diffY > 40) {
          if (window.FamCalCalendar.getViewMode() === 'week') {
            isAutoCollapsed = false;
            window.FamCalCalendar.setViewMode('month', false);
            fixedContainer.classList.remove('is-collapsed');
          }
        }
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
