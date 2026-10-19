## [2026-10-19T23:13:55+01:00 / v2.30.34]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Added delivery verification to `notify.js` (detecting empty token states and FCM errors) and surfaced live token registration feedback in `notifications.js`.
- **Files Changed:**
  - `netlify/functions/notify.js`
  - `public/modules/notifications.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Refresh app on iPhone (cache v68), tap the Push Alerts toggle to verify token registration success, then tap Test to view exact delivery feedback.
