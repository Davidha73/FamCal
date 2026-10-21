## [2026-10-21T18:52:00+01:00 / v2.30.69]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Reduced bottom spacing when virtual keyboard is active by zeroing the redundant safe-area offset and tightening bottom container and card padding, docking the message composer close to the keyboard toolbar.
- **Files Changed:**
  - `public/style.css`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Focus the message input on iPhone to verify the message compose window rests snugly right above the keyboard accessory bar without an excessive gap.
