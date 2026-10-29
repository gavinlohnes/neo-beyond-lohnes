# REAL-DATA-001 — fixes from the owner's real backup

- **Authority:** Gavin, 2026-10-28: "Use whatever is beneficial for beyond", after the field study
  ([report](https://claude.ai/artifact/3QYkVbMnVzQHUqgJLx4Mvr)) and his real backup (Sep 1 – Oct 28).
- **Builder / lane:** Claude Code; Routine (presentation and read-side only; no Engine, event,
  schema or recommendation-priority change). Branch `ccr-0be4f40f-16m0ja`.
- **Privacy:** the backup stayed in the session. No personal text from it is in the repo; tests
  use invented titles.

## Findings and fixes

| Real data | Fix |
| --- | --- |
| An overdue note led TODAY as "An obligation needs attention" 9 times; closing it lived in another panel | The OBLIGATION_DUE card offers DONE, NOT A TASK (each asks once; both one-way) and NEW DATE |
| 10 of 12 workouts abandoned within seconds; exercises were folded behind "Workout prescription" | Today's exercises show under START WORKOUT without a tap |
| TRAIN's last training read "Completed · 0 working sets · 0 min" | LAST is the newest session with at least one working set |
| A workout left open opened BEYOND on TRAIN days later | Launch resumes TRAIN only for a workout touched in the last 2 hours (the roll's idle rule); older ones stay on TODAY as WORKOUT STILL OPEN |
| After a shift: two WORK ENDED buttons; the owner's plan sat below the explanation | One MARK WORK ENDED (in SHIFT DOWN); the plan leads the card |
| DATA said MAIN SLEEP "Not logged" beside TODAY's Garmin 7:15 | DATA falls back to the same Garmin night, labelled "Garmin · last main sleep" |

## Leverage

- **REUSE:** existing intent commands (`satisfyObligation`, `releaseObligation`, `modifyObligation`),
  `workoutHoldsRollover`, `getMeasuredSnapshot().lastNight`, ShiftDownCard and TRAIN's prescription.
- **OWN:** where each existing piece appears.
- **BUILD FROM SCRATCH:** none.

## Waiting for Gavin (Protected)

LOG in the bottom bar, a quieter ON SHIFT TODAY, a shorter PREFLIGHT, not advancing the rotation on
an empty completion, and check-in "same as last" with a plain "why".
