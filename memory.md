## [2026-10-19T21:06:00+01:00 / v2.30.9]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Resolved iOS Safari viewport collapse on short views by enforcing `100dvh` min-height on `html`, `body`, and `.app-main`, and applying hardware acceleration to `.bottom-nav-bar`; embedded the immediate 'No messages yet' empty state in `index.html` with instant initialization in `noticeboard.js` and `messages.js`; bumped Service Worker cache to v52.
- **Files Changed:**
  - `public/style.css`
  - `public/index.html`
  - `public/modules/noticeboard.js`
  - `public/modules/messages.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Verify on iPhone that the navbar stays locked to the bottom edge on Noticeboard and Messages, and test posting notes.
