## [2026-10-19T23:22:30+01:00 / v2.30.35]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Configured Apple APNs lock-screen wake headers (`apns-priority: 10`, `apns-push-type: alert`, `sound: default`) in `notify.js` and added an immediate push event handler in `firebase-messaging-sw.js` to guarantee iOS lock-screen presentation.
- **Files Changed:**
  - `netlify/functions/notify.js`
  - `public/firebase-messaging-sw.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Refresh JustUs on iPhone, lock the screen, and send a message from the laptop to verify the display turns on with a banner.
