## [2026-10-21T19:13:00+01:00 / v2.30.71]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Replaced disruptive scroll-hijacking with smooth animated transitions for the pinned calendar, allowing instant, graceful toggling between Month and Week views via the handle or swipe gestures with zero scroll jumping.
- **Files Changed:**
  - `public/modules/calendar-scroll.js`
  - `public/style.css`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Tap the pill handle beneath the calendar card or swipe up/down on the grid to test the smooth animated transition between Month and Week view while keeping the calendar pinned.
