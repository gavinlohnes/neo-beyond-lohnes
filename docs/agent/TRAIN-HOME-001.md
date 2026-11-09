# TRAIN-HOME-001 — TRAIN opens like YOUR LIFE, MORE and DATA

- **Authorization:** Gavin picked **"A"** (TRAIN in the new style) for the 2026-11-09 23:30 session (checkpoint #457)
  and started it with "Let's work". **Lane: Protected** (TRAIN's primary information architecture), approved.
  Builder: Claude Code.
- **What:** when no workout is running and the WORKOUT view shows, TRAIN's purpose line becomes a compact hero in
  the shared style: the date, **YOUR TRAINING.**, and the same purpose line, with the red rule.
- **Compact on purpose:** DECLUTTER-001 keeps **START WORKOUT on the first phone screen**, so this hero has no extra
  actions and no shortcuts. The WORKOUT / HISTORY / RECORDS switcher is already TRAIN's shortcut row.
- **Unchanged:** the live workout view (it never shows the hero), the switcher, the workout card, START WORKOUT, the
  completion summary ("Review what you recorded.") and every route. Nothing is removed.

**Leverage gate.**
- **REUSE:** MORE-HOME-001's `systemsHome.css`.
- **OWN:** the compact variant.
- **BUILD FROM SCRATCH:** none.

**Evidence.**
- `tests/browser/TrainHome.test.tsx`: the hero; START WORKOUT above the bottom navigation at 360×780; the 16 px
  floor; fits 360 px. It passed 5 runs in a row.
- All 39 TRAIN-related browser files pass locally (475 tests).
