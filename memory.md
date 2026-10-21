## [2026-10-21T18:41:00+01:00 / v2.30.67]
<!-- CRITICAL: Keep this file under 200 words. Condense history ruthlessly. -->

- **Status:** Converted message input into an auto-expanding multi-line textarea that wraps long text to new lines, expands up to 4 rows, supports Enter to send and Shift+Enter for manual line breaks, and resets smoothly on send.
- **Files Changed:**
  - `public/index.html`
  - `public/style.css`
  - `public/modules/messages.js`
  - `public/sw.js`
  - `memory.md`
- **Next Objectives:** Type a long message in the chat input to confirm text wraps to subsequent lines as it reaches the edge, and verify Enter sends while Shift+Enter inserts a new line.
