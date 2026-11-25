# GRAYSON-C6.1-FOLLOWUP-001 — #639 review nits

- **Authorization:** within C6.1 + C6.2 (Gavin, 2026-11-24, "Agreed"); the non-blocking findings of #639's PASS
  review. Gavin's "Let's work" (2026-11-24). **Lane:** ROUTINE: Builder merges after an independent exact-head PASS
  and green CI. **Builder:** Claude Code. **Branch:** `ccr-380c4225-1es42i`.
- **Changes:**
  - A weekly ask holds its slot for the week even if its learning can no longer be derived, so a fourth is never
    offered.
  - A kept #tag pattern that now compares a different measure says "Delta now compares something different" rather
    than "the other way".
  - Delta's "I know N of M" no longer counts a topic he dropped.
  - The checkpoint is brought up to date (master after #699, the builders, the open PRs, and the forward-compat note
    for the strict LEARNING_RESPONDED payload).
- **REUSE:** the existing lifecycle and views. **OWN:** three conditions. **BUILD FROM SCRATCH:** none.
- **Acceptance:** `tests/learningLifecycle.test.ts` (13, including the new held-slot case); the Delta, weekly and coach
  browser suites.
