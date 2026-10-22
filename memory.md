## [2026-10-22T22:05:52+01:00 / v2.30.85]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Removed the redundant `messaging.onBackgroundMessage` push handler from `firebase-messaging-sw.js`, consolidating all background notification dispatch into a single top-level push listener with local debouncing and unified tag collapsing.
- **Files Changed:**
  - `public/firebase-messaging-sw.js`
  - `memory.md`
- **Next Objectives:** Deploy updated files to Netlify production and refresh mobile PWA clients to run the single push listener.
