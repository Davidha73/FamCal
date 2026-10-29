## [2026-10-29T22:38:00Z / v2.30.87]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Bumped service worker cache version to `famcal-shell-v03` and added automatic background update polling on app initialization and visibility resume.
- **Files Changed:**
  - `public/sw.js`
  - `public/modules/updater.js`
  - `memory.md`
- **Next Objectives:** Deploy updated files to Netlify production so PWA clients automatically pull the new cache version.
