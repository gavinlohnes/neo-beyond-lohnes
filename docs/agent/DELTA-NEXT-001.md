# DELTA-NEXT-001 — DELTA gets smarter (Gavin: "All", 2026-11-09)

- **Authorization:** Gavin replied **"All"** to the Builder's 8-item list on 2026-11-09. That approves every item,
  including item 6 ("what moves the needle", Protected because it ranks). Each item is still a reading: patterns,
  not causes; counts on every line; silence is valid; nothing feeds the Engine or changes advice. Item 8 (rotation
  field test #402) needs Gavin on his phone. One PR per item. Builder: Claude Code.

| # | Item | Status |
|---|---|---|
| 1 | **Unusual for you:** DELTA's notebook and TODAY line show the measured sheets' existing "unusual for you" streaks (resting HR, sleep, steps) while they last | this PR |
| 4 | Tags on check-ins and workouts | next |
| 5 | Weekly "what changed" | next |
| 7 | One-tap answer to DELTA's question | next |
| 2 | Shift-run forecast (labelled forecast, reading only) | next |
| 3 | Best windows in the rotation (suggests, never books) | next |
| 6 | What moves the needle (data-first gate: months of data) | next |
| 8 | Rotation field test #402 | waits for Gavin |

## Item 1
- **REUSE:** `unusualStreak` / `UNUSUAL_SPECS` (ROTATION-002) via `getMeasuredSnapshot`, and `describeUnusual`'s
  wording, which says "not a diagnosis or a cause".
- **OWN:** the notebook entry ("Noticed <date>: …") and the TODAY wording ("DELTA noticed something unusual for
  you").
- **BUILD FROM SCRATCH:** none.
- **Tests:** `tests/integration/delta.test.ts` checks that a streak is noticed and dated on its newest day, and that
  there is silence without one.
