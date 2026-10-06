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

ARCHITECTURAL: a placement rule for suggested workouts. **Building waits for Gavin's written
sign-off on the placement rule** (no Engine rule adoption without it, ruling 2026-10-03).

## Authorized scope

Pending sign-off. Proposed for Gavin to pick:

- **A (recommended):** a workout on each day off and none on a work day; the template follows the
  existing A/B rotation; at most 2 days in a row.
- **B:** as A, plus one short session on the post-shift morning before a day off.
- **C:** fixed count per week (e.g. 3), spread across days off first.

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

Set once Gavin picks the rule.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · `npm run check:risk -- <baseline>` · PR Verification green.

## Builder expectations

Claude Code, only after written sign-off on a placement rule.

## Reviewer expectations

A separate session checks the built rule against the signed-off one.

## Integrator expectations

Architectural: waits for Gavin to approve the merge.

## Stop / escalation conditions

Stop now until the placement rule is signed off.
