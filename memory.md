## [2026-10-21T20:28:00+01:00 / v2.30.80]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Fixed calendar scroll collapse. Hooked up active scroll and touch drag event triggers synchronized with day event rendering, ensuring the calendar collapses immediately on upward scroll whenever event cards overflow.
- **Files Changed:**
  - `public/modules/calendar-scroll.js`
  - `public/app.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Verify that scrolling up on dates with overflowing event cards immediately collapses the calendar into week view.
