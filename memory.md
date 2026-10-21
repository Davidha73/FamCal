## [2026-10-21T18:25:00+01:00 / v2.30.64]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Suppressed intrusive push notifications while the app is actively open in the foreground across service worker push handlers, background messaging listeners, and in-app message listeners.
- **Files Changed:**
  - `public/firebase-messaging-sw.js`
  - `public/modules/notifications.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Validate that sending a message while the app is active updates the chat feed in real time without triggering a system notification banner, and that notifications only appear when the app is minimized or locked.
