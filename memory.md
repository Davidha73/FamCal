## [2026-10-19T22:20:00+01:00 / v2.30.22]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Resolved messaging connection errors by implementing `ensureDb` on send, adding `famcal-firebase-ready` event listeners, adding robust client config fallbacks, and bumping the service worker cache.
- **Files Changed:**
  - `public/modules/firebase-init.js`
  - `public/modules/messages.js`
  - `public/modules/noticeboard.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Send a test message in the family chat to verify immediate Firestore transmission and feed updating.
