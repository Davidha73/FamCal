(function () {
  function initSplash() {
    const splashEl = document.getElementById('splash-screen');
    if (!splashEl) return;

    const startTime = Date.now();
    const MIN_DISPLAY_MS = 650;

    function hideSplash() {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

      setTimeout(() => {
        splashEl.classList.add('is-hidden');
        splashEl.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          if (splashEl && splashEl.parentNode) {
            splashEl.parentNode.removeChild(splashEl);
          }
        }, 400);
      }, remaining);
    }

    if (document.readyState === 'complete') {
      hideSplash();
    } else {
      window.addEventListener('load', hideSplash, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSplash);
  } else {
    initSplash();
  }
})();
