## [2026-10-20T19:48:30+01:00 / v2.30.46]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Docked the calendar container directly to the header via a negative top margin with integrated top padding, maintaining the visual gap permanently while eliminating initial scroll travel so the calendar stays completely motionless.
- **Files Changed:**
  - `public/style.css`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Refresh JustUs on iPhone, verify that scrolling the event cards causes zero movement in the calendar card and Add Event button, and confirm the top spacing beneath the header remains stable.
