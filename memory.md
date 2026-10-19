## [2026-10-19T23:08:00+01:00 / v2.30.33]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Replaced Google Calendar service account fallback in `netlify/functions/notify.js` with the dedicated Justus Firebase service account (`justus-5b537`), restoring Firestore token querying and FCM push delivery.
- **Files Changed:**
  - `netlify/functions/notify.js`
  - `memory.md`
- **Next Objectives:** Tap the "Test" button in the Settings drawer on iPhone to verify successful FCM token querying and push delivery.
