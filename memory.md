## [2026-10-19T20:54:00+01:00 / v2.30.8]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Created a unified navigation module (`modules/navigation.js`) providing a single, consistent fixed bottom navbar across Calendar, Noticeboard, and Messages; normalized all view bottom clearances to 56px and bumped Service Worker cache to v51.
- **Files Changed:**
  - `public/modules/navigation.js`
  - `public/modules/noticeboard.js`
  - `public/index.html`
  - `public/style.css`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Verify bottom navbar placement, view switching, and unread badges across all screens.
