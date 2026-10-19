## [2026-10-19T22:57:15+01:00 / v2.30.30]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Integrated Apple iOS WebPush headers (`Urgency: high`), full service worker activation gating for FCM tokens, and an interactive "Test Push" diagnostic button in the Settings drawer.
- **Files Changed:**
  - `netlify/functions/notify.js`
  - `public/modules/notifications.js`
  - `public/index.html`
  - `public/style.css`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Re-open JustUs on iPhone, navigate to Settings, and tap the new 'Test' button to verify instant push delivery.
