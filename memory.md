## [2026-10-20T20:08:10+01:00 / v2.30.54]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Removed the artificial iOS standalone lock that was forcibly resetting the push alerts toggle to OFF, enabling the switch to flip and persist freely.
- **Files Changed:**
  - `public/modules/notifications.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Refresh JustUs, tap the Push Alerts toggle, and verify that the switch slides smoothly to the ON state.
