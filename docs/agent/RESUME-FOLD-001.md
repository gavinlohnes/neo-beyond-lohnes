# RESUME-FOLD-001 — RESUME WORKOUT stays above the nav

- **Why:** CommandConsole's "RESUME WORKOUT above the nav" check failed now and then on #530, #532 and #534 (and on
  master), always 16.5 px. Root cause, measured: once TODAY has fully settled at 412 × 800, the mode name (56 px) and
  the full skyline scene (88 px) put RESUME WORKOUT 17 px under the nav. The check only passed when it measured before
  the last reads arrived; a saved Alfred key (Gavin's real setup) made the late state arrive in time to be measured.
  So it was a real fold problem on a phone like Gavin's, not test noise.
- **Authorization:** routine repair inside the approved queue (Gavin, 2026-11-15: "Approved."; red CI on his PRs must
  be fixed at its root). Builder Claude Code, branch `ccr-88f5c085-resume-fold`, from master `1fed57c8`.
- **Fix:** DAY-MAP-001 already steps the day map aside "while an operation owns the screen, so RESUME stays above the
  fold". The same condition now also gives the scene its existing thin height (36 px, FIELD-AUTHORITY-001's
  `cc-mode--thin` size). Nothing else changes: the scene, mode, band and every action are as before.
- **Leverage gate.** REUSE: the existing thin scene size and the existing "operation owns the screen" condition. OWN:
  one class. BUILD FROM SCRATCH: none.
- **Test:** `tests/browser/ResumeFold001.test.tsx` measures after TODAY settles, with an Alfred key saved, at 320, 360
  and 412 px. It fails without the fix (412: 751.5 > 735, the CI number) and passes with it.
