## [2026-10-21T19:05:00+01:00 / v2.30.70]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Created modular calendar scroll module enabling the full month grid to automatically collapse into a compact 1-week strip containing the selected day when scrolling down through events, and expand back to full month when returning to the top.
- **Files Changed:**
  - `public/modules/calendar-scroll.js`
  - `public/index.html`
  - `public/app.js`
  - `public/style.css`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** On mobile, scroll up through the upcoming events list to verify the month grid collapses to the compact 1-week row, exposing more event cards, and scroll back to the top (or tap the collapse pill) to restore the full month.
