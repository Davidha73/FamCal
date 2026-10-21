// JustUs - Collapsible Mobile Calendar Module
(function () {
  'use strict';

  let touchStartY = 0;
  let touchStartX = 0;
  let lastScrollY = 0;
  let isTransitioning = false;

  function doCardsFitBelowFullCalendar() {
    const eventsContainer = document.getElementById('calendar-events');
    const bottomNav = document.getElementById('app-bottom-nav') || document.querySelector('.bottom-nav-bar');
    if (!eventsContainer) return true;

    const cards = eventsContainer.querySelectorAll('.event-card');
    if (cards.length === 0) return true;

    const navTop = bottomNav ? bottomNav.getBoundingClientRect().top : (window.innerHeight - 64);
    const lastCard = cards[cards.length - 1];
    const scrollOffset = window.scrollY || document.documentElement.scrollTop || 0;
    const lastCardBottom = lastCard.getBoundingClientRect().bottom + scrollOffset;
    const targetBottom = navTop + scrollOffset;

    return lastCardBottom <= (targetBottom + 4);
  }

  function updateScrollState() {
    const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    if (activeTab !== 'calendar') {
      document.body.classList.remove('no-calendar-scroll');
      return;
    }

    if (!window.FamCalCalendar) return;
    const currentMode = window.FamCalCalendar.getViewMode();

    if (currentMode === 'month') {
      const fits = doCardsFitBelowFullCalendar();
      if (fits) {
        document.body.classList.add('no-calendar-scroll');
      } else {
        document.body.classList.remove('no-calendar-scroll');
      }
    } else {
      document.body.classList.remove('no-calendar-scroll');
    }
  }

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
            updateScrollState();
          }, 40);
        });
      }, 90);
    } else {
      window.FamCalCalendar.setViewMode(nextMode, persist);
      if (fixedContainer) {
        fixedContainer.classList.toggle('is-collapsed', nextMode === 'week');
      }
      updateScrollState();
    }
  }

  function onScrollOrSwipeUp() {
    if (isTransitioning || !window.FamCalCalendar) return;
    const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    if (activeTab !== 'calendar') return;

    const currentMode = window.FamCalCalendar.getViewMode();
    if (currentMode === 'month') {
      const cardsFit = doCardsFitBelowFullCalendar();
      if (!cardsFit) {
        isTransitioning = true;
        setViewSmoothly('week', true);
        setTimeout(() => {
          isTransitioning = false;
        }, 320);
      }
    }
  }

  function onScrollOrSwipeDown() {
    if (isTransitioning || !window.FamCalCalendar) return;
    const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
    if (activeTab !== 'calendar') return;

    const currentMode = window.FamCalCalendar.getViewMode();
    if (currentMode === 'week') {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollPos <= 10) {
        isTransitioning = true;
        setViewSmoothly('month', true);
        setTimeout(() => {
          isTransitioning = false;
        }, 320);
      }
    }
  }

  function init() {
    const fixedContainer = document.getElementById('calendar-fixed-container');
    const calendarView = document.getElementById('calendar-view-container');
    const collapseHandle = document.getElementById('calendar-collapse-handle');
    const eventsContainer = document.getElementById('calendar-events');

    if (!fixedContainer) return;

    window.addEventListener('famcal-events-rendered', () => {
      requestAnimationFrame(updateScrollState);
    });

    window.addEventListener('famcal-view-changed', (e) => {
      if (e.detail && e.detail.mode) {
        fixedContainer.classList.toggle('is-collapsed', e.detail.mode === 'week');
      }
      updateScrollState();
    });

    window.addEventListener('famcal-tab-changed', (e) => {
      if (e.detail && e.detail.tab === 'calendar') {
        setTimeout(updateScrollState, 50);
      } else {
        document.body.classList.remove('no-calendar-scroll');
      }
    });

    window.addEventListener('resize', () => {
      updateScrollState();
    });

    if (eventsContainer && window.MutationObserver) {
      const observer = new MutationObserver(() => {
        setTimeout(updateScrollState, 30);
      });
      observer.observe(eventsContainer, { childList: true, subtree: true });
    }

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

    window.addEventListener('scroll', () => {
      const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
      if (activeTab !== 'calendar' || !window.FamCalCalendar) return;

      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      const currentMode = window.FamCalCalendar.getViewMode();

      if (scrollPos > 12 && currentMode === 'month') {
        onScrollOrSwipeUp();
      }
      lastScrollY = scrollPos;
    }, { passive: true });

    const gestureTarget = calendarView || document;

    document.addEventListener('touchmove', (e) => {
      const activeTab = localStorage.getItem('famcal-active-tab') || 'calendar';
      if (activeTab !== 'calendar') return;

      if (document.body.classList.contains('no-calendar-scroll')) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (e.touches && e.touches.length === 1) {
        const currentY = e.touches[0].clientY;
        const diffY = currentY - touchStartY;
        if (diffY < -28) {
          onScrollOrSwipeUp();
        }
      }
    }, { passive: false });

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
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const diffY = touchEndY - touchStartY;
      const diffX = touchEndX - touchStartX;

      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 25) {
        if (diffY < -25) {
          onScrollOrSwipeUp();
        } else if (diffY > 25) {
          onScrollOrSwipeDown();
        }
      }
    }, { passive: true });

    setTimeout(updateScrollState, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
