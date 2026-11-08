# POLISH-003 — polish what shipped

- **Authorization:** Gavin, 2026-11-08, chose "Polish pass" when asked what to work on after about 35 features
  shipped in two days (CONNECTED-001, APPS-PICKS-002, APPS-PICKS-003).
- **Lane:** routine — wording and visibility only. **Builder:** Claude Code. **Starting commit:** `42b4b0d5` (#444).
- **Scope:** photograph the screens those features touched at a real 360 × 800 phone viewport; replace slogans with
  plain words; hide empty sections and bare zeros; fix truncated or confusing copy; keep each page short.
- **Exclusions:** no new features; no Engine, recommendation, schema, event, backup or TODAY-top change; no change to
  locked decisions.
- **Acceptance:** before/after captures in `docs/screenshots/polish-003/`, focused tests updated, full suite green,
  independent exact-head review per batch.
- **Leverage gate.** REUSE: the LIFE-PATTERN-001 rules and the existing screens. OWN: the copy. BUILD FROM SCRATCH: none.
