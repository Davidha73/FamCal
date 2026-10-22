## [2026-10-22T21:47:35+01:00 / v2.30.83]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Resolved triple notification delivery on recipient devices by enforcing user-level FCM token deduplication in `notify.js` and `check-reminders.js` (retaining only the most recently active device per user), auto-deleting stale duplicate or uninstalled tokens, and purging prior device tokens on client sync in `notifications.js`.
- **Files Changed:**
  - `public/modules/notifications.js`
  - `netlify/functions/notify.js`
  - `netlify/functions/check-reminders.js`
  - `memory.md`
- **Next Objectives:** Verify push alert single-delivery to Liv's device during next notification dispatch.
