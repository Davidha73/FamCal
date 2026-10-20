## [2026-10-20T20:57:00+01:00 / v2.30.61]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Resolved photo sending hang by switching to direct client-side canvas compression (~45KB) that writes immediately to Firestore without stalling on unconfigured Storage buckets.
- **Files Changed:**
  - `public/modules/photo-upload.js`
  - `public/modules/messages.js`
  - `public/index.html`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Refresh JustUs, attach a photo in the Messages tab, and tap Send to confirm instant posting and chat bubble rendering.
