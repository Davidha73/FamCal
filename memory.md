## [2026-10-19T22:43:00+01:00 / v2.30.27]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Integrated notifications controls into the Settings drawer with iOS standalone detection, automatic notification initialization, and resilient background message token registration.
- **Files Changed:**
  - `public/index.html`
  - `public/modules/notifications.js`
  - `public/style.css`
  - `public/firebase-messaging-sw.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Open the Settings drawer on iPhone (from Home Screen) and tap the notifications button to trigger iOS permission and register in iPhone Settings.
