// JustUs - Collapsible Mobile Calendar Module
(function () {
  'use strict';

  let touchStartY = 0;
  let touchStartX = 0;

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
    const calendarView = document.getElementById('calendar-view-container');
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

    const gestureTarget = calendarView || document;

    gestureTarget.addEventListener('touchstart', (e) => {
      const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
      if (activeTab !== 'calendar') return;
      if (e.touches && e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    gestureTarget.addEventListener('touchend', (e) => {
      const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
      if (activeTab !== 'calendar') return;
      if (!window.FamCalCalendar) return;
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const diffY = touchEndY - touchStartY;
      const diffX = touchEndX - touchStartX;

      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 35) {
        const currentMode = window.FamCalCalendar.getViewMode();

        if (diffY < -35 && currentMode === 'month') {
          setViewSmoothly('week', true);
        } else if (diffY > 35 && currentMode === 'week') {
          const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
          if (scrollPos <= 20) {
            setViewSmoothly('month', true);
          }
        }
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
