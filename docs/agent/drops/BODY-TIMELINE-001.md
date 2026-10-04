---
id: BODY-TIMELINE-001
baseline: 5538f0f7750905baa8116a54cd9218a23a7be6ec
risk_tier: ROUTINE
---

# BODY-TIMELINE-001 // TRANSFORMATION TIMELINE (BODY)

## Mission

A read-only TIMELINE in BODY: the weight trend with events pinned on it: PRs, clean-day
milestones, weight milestones ("lowest since …"), and the goal date. Filters per event type.
Owner brief 2026-10-04 (Queue item 4).

## Approved baseline

`origin/master` at `5538f0f7750905baa8116a54cd9218a23a7be6ec` (update before init).

## Risk classification

ROUTINE: read-only composition of existing data (`bodyTrendQueries` weigh-ins, milestones,
`projectGoalDate`; PRs from `findSessionRecords`; clean days from `CLEAN_DAY_LOGGED`). No new data.

## Authorized scope

- `application/timelineQueries.ts`: one list of dated events {kind: PR | CLEAN_DAY_MILESTONE |
  WEIGHT_MILESTONE | GOAL, date, label} plus weigh-ins. Clean-day milestones at 7, 30, 60, 90,
  180, 365 clean days (count, never a resetting streak).
- BODY: inside the BODYWEIGHT station, a "SHOW TIMELINE" disclosure (no new row on TODAY, no new
  tab) with an SVG line of weight over the last 90 days, event markers, the goal date pinned at
  the right edge when projected, and filter chips: PRs · Clean days · Weight · Goal (all on).
- Tapping a marker shows its one-line label.

## Explicit exclusions

No new tracking, no editing from the timeline, no Engine use, no Weekly change (F1 field test).

## Relevant authority / references

Drop 5 (weight trend, milestones, goal date); Drop 6 (clean days, never a resetting streak);
adherence-neutral wording.

## Required invariants

Every marker matches what its source screen already says (same PRs, same milestone text).

## Acceptance criteria

1. With weigh-ins, PRs and clean days, the timeline shows each kind; each filter hides its kind.
2. No weigh-ins: "Log a bodyweight to start your timeline", no empty chart.
3. Goal pin appears only when `projectGoalDate` gives a date.
4. 320–412 px, no overflow; markers ≥ 44 px tap targets.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Build, verify, PR `[NEEDS CLAUDE REVIEW] BODY-TIMELINE-001: …`, handoff, stop.

## Reviewer expectations

Claude Code checks marker/source agreement and read-only.

## Integrator expectations

Routine: merges on green checks; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a new data source or chart dependency seems needed (use inline SVG, as WeightTrend does).
