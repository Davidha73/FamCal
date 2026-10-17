(function () {
  function showUpdateBanner() {
    const banner = document.getElementById('update-banner');
    if (!banner) return;
    banner.classList.remove('hidden');
    banner.setAttribute('aria-hidden', 'false');
  }

  function hideUpdateBanner() {
    const banner = document.getElementById('update-banner');
    if (!banner) return;
    banner.classList.add('hidden');
    banner.setAttribute('aria-hidden', 'true');
  }

  function setupUpdater() {
    if (!('serviceWorker' in navigator)) return;

    const reloadBtn = document.getElementById('update-reload-btn');
    const dismissBtn = document.getElementById('update-dismiss-btn');

    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', hideUpdateBanner);
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner();
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      showUpdateBanner();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUpdater);
  } else {
    setupUpdater();
  }
})();
