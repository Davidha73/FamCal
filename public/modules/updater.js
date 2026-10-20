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

  let waitingWorker = null;
  let isRefreshing = false;

  function setupUpdater() {
    if (!('serviceWorker' in navigator)) return;

    const reloadBtn = document.getElementById('update-reload-btn');
    const dismissBtn = document.getElementById('update-dismiss-btn');

    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } else {
          window.location.reload();
        }
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', hideUpdateBanner);
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        const script = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
        if (script.includes('firebase-messaging-sw.js')) {
          reg.unregister();
        }
      }
    });

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        waitingWorker = registration.waiting;
        showUpdateBanner();
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = newWorker;
            showUpdateBanner();
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUpdater);
  } else {
    setupUpdater();
  }
})();
