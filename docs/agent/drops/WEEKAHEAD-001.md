---
id: WEEKAHEAD-001
baseline: SET-AT-ACTIVATION
risk_tier: ARCHITECTURAL
---

# WEEKAHEAD-001 // WEEK AHEAD

## Mission

Owner brief 2026-10-05, item 10. The next 7 days of the rotation, with suggested workouts placed
around shifts. BEYOND suggests; Gavin moves or skips. Example: "Thu OFF · Workout B" / "Fri 1800
shift · rest".

## Approved baseline

Set at activation to fresh `origin/master`.

## Risk classification

ARCHITECTURAL: a placement rule for suggested workouts. **Placement rule signed off by Gavin
2026-10-06 ("3. A")**; the merge still waits for Gavin.

## Authorized scope

Signed-off rule (Gavin, 2026-10-06, option A): a workout on each day off and none on a work day;
the template follows the existing A/B rotation; at most 2 days in a row. (Options B and C were
not chosen.)

Surface: Weekly (read only), one row "WEEK AHEAD", opening the 7 days. Week Ahead stores nothing:
moving or skipping is simply doing something else on the day, answered on TODAY/TRAIN as now
(PLANNED-WORK-001). The Engine is not told.

## Explicit exclusions

No Engine change; the suggestion never overrides TODAY's recommendation.

## Relevant authority / references

Owner brief 2026-10-05; owner ruling 2026-10-03 (rule adoption needs sign-off); PLANNED-WORK-001.

## Required invariants

Suggestions are labeled as suggestions; skipping costs nothing (no shame, no streak).

## Acceptance criteria

1. The next 7 days show each day's shift (or OFF) from the saved schedule, and a suggested
   workout on days off only (tests).
2. Never more than 2 suggested days in a row; templates follow the A/B rotation (tests).
3. Read only; nothing stored; the Engine is unchanged (tests).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · `npm run check:risk -- <baseline>` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, Standard report, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks the built rule against the signed-off one.

## Integrator expectations

Architectural: waits for Gavin to approve the merge.

## Stop / escalation conditions

Stop if placement would need Engine input or a stored field.
