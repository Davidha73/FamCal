// JustUs - Collapsible Mobile Calendar Module
(function () {
  'use strict';

  let touchStartY = 0;

  function setViewSmoothly(nextMode, persist = true) {
    if (!window.FamCalCalendar) return;
    const daysGrid = document.getElementById('calendar-days-grid');
    const fixedContainer = document.getElementById('calendar-fixed-container');

    if (daysGrid) {
      daysGrid.classList.add('is-transitioning');
      setTimeout(() => {
        window.FamCalCalendar.setViewMode(nextMode, persist);
        if (fixedContainer) {
          fixedContainer.classList.toggle('is-collapsed', nextMode === 'week');
        }
        requestAnimationFrame(() => {
          setTimeout(() => {
            daysGrid.classList.remove('is-transitioning');
          }, 40);
        });
      }, 90);
    } else {
      window.FamCalCalendar.setViewMode(nextMode, persist);
      if (fixedContainer) {
        fixedContainer.classList.toggle('is-collapsed', nextMode === 'week');
      }
    }
  }

  function init() {
    const fixedContainer = document.getElementById('calendar-fixed-container');
    const calendarCard = document.querySelector('.calendar-card');
    const collapseHandle = document.getElementById('calendar-collapse-handle');

    if (!fixedContainer) return;

    window.addEventListener('famcal-view-changed', (e) => {
      if (e.detail && e.detail.mode) {
        fixedContainer.classList.toggle('is-collapsed', e.detail.mode === 'week');
      }
    });

    if (collapseHandle) {
      collapseHandle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.FamCalCalendar) return;
        const currentMode = window.FamCalCalendar.getViewMode();
        const nextMode = currentMode === 'month' ? 'week' : 'month';
        setViewSmoothly(nextMode, true);
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

        if (diffY < -45) {
          if (window.FamCalCalendar.getViewMode() === 'month') {
            setViewSmoothly('week', true);
          }
        } else if (diffY > 45) {
          if (window.FamCalCalendar.getViewMode() === 'week') {
            setViewSmoothly('month', true);
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
