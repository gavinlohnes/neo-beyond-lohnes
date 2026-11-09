# DELTA-NEXT-001 — DELTA gets smarter (Gavin: "All", 2026-11-09)

- **Authorization:** Gavin replied **"All"** to the Builder's 8-item list on 2026-11-09. That approves every item,
  including item 6 ("what moves the needle", Protected because it ranks). Each item is still a reading: patterns,
  not causes; counts on every line; silence is valid; nothing feeds the Engine or changes advice. Item 8 (rotation
  field test #402) needs Gavin on his phone. One PR per item. Builder: Claude Code.

| # | Item | Status |
|---|---|---|
| 1 | **Unusual for you:** DELTA's notebook and TODAY line show the measured sheets' existing "unusual for you" streaks (resting HR, sleep, steps) while they last | this PR |
| 4 | **Tags after a workout:** HOW DID IT FEEL (#felt-strong, #felt-flat, #short-on-time, #sore) on the workout summary adds the tag to today's daily note; #stressed joins the note's suggestions | this PR (with 1, 7) |
| 5 | **Weekly "what changed":** the weekly review shows DELTA · WHAT CHANGED THIS WEEK, up to 3 notebook lines dated in that week, or "Nothing new this week" | this PR (with 1, 7, 4) |
| 7 | **One-tap answer:** ROUGH / OK / GOOD under DELTA's question draft "<question> Good." into the note; SAVE NOTE still saves | this PR (with 1) |
| 2 | **Shift-run forecast:** DELTA · LOOKING AHEAD gives the next work run from your schedule, then what past runs looked like at shift 1–3 (ROTATION-001 positions, with counts) | this PR |
| 3 | **Best windows:** the next days off plus the day off you've trained on most ("trained on N of M"); suggests, never books | this PR |
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

## Item 7
- **REUSE:** the existing question and draft. **OWN:** three words. **BUILD FROM SCRATCH:** none.
- **Tests:** `tests/browser/Delta.test.tsx`: GOOD drafts "<question> Good." and nothing is saved.

## Item 4 (as built, no new data)
Check-ins and workouts have no note field, and adding one would be a schema and command change that wasn't
flagged. So tags from elsewhere go into **today's daily note** through the ordinary `saveDailyNote`, on the tap.
JOURNAL-LEARN tag patterns and DELTA then compare them like any tag. A tag is removed in the note itself. Check-in
tags use the note's tag row (#stressed added to the suggestions), so TODAY's check-in flow is unchanged.
- **Tests:** `tests/integration/noteTags.test.ts`: adds once, keeps the written text, normalises. The TRAIN suites
  pass (179).

## Items 2 and 3 (as built)
- **REUSE:** ROTATION-001's `nextForecastRun`, `nextDaysOff`, `runPositions`, `describePosition` and
  `mostTrainedDayOff`, already shown in Review's rotation map, gathered into DELTA's view.
- Labelled "A forecast from your schedule and your own records. I suggest; I never book anything or change advice."
- **Test:** `tests/browser/Delta.test.tsx` checks that the section and its forecast label render.
