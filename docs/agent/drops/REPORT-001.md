---
id: REPORT-001
baseline: c83114f7bbb721a473fb45eb523d853a300b7910
risk_tier: ARCHITECTURAL
---

# REPORT-001 // BRIEFING / AFTER ACTION REPORT

## Mission

Owner brief 2026-10-05, item 8 (approved merge: Briefing and After Action Report are one report).
One report, two timings. Example: on a work night at 0300, TODAY shows "BRIEFING READY"; the first
day off after the block shows "AFTER ACTION READY". Both open the same five-item report.

## Approved baseline

`origin/master` at `c83114f7bbb721a473fb45eb523d853a300b7910`.

## Risk classification

ARCHITECTURAL: a new TODAY line and a new deterministic report (including one suggested call).
Pure and outside the Engine; it never changes or feeds a recommendation.

## Authorized scope

- **Timing:** on a work night between 0200 and 0500, one line "BRIEFING READY"; on the first day
  off after a work block, "AFTER ACTION READY". Also reachable from Weekly at any time.
- **Five items max:** (1) this block vs last (sessions, sets, average sleep); (2) what moved (PRs,
  clean-day and weight milestones); (3) what stalled (a lift trained in the block whose heaviest
  set hasn't risen in 3+ weeks); (4) what's coming (next work block dates, a capsule opening);
  (5) ONE call phrased as a suggestion, from a fixed ordered list (proposed for Gavin's sign-off:
  a stalled lift → "Consider a lighter week on X"; average sleep under 6 h → "Consider protecting
  sleep before the next block"; else none).
- A "block" is a run of consecutive scheduled work days from the saved schedule.

## Explicit exclusions

No Engine change; no AI; nothing stored; no notification.

## Relevant authority / references

Owner brief 2026-10-05; Command Center Rule 3 (surfaces only in its phase); adherence-neutral rule.

## Required invariants

Deterministic for the same data and time (test); Engine untouched; no item when data is missing.

## Acceptance criteria

1. The line appears only in its window / first day off (tests).
2. The report never shows more than five items; the call is phrased as a suggestion (tests).
3. Weekly opens it any time (test).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · `npm run check:risk -- <baseline>` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, Standard report, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks determinism, the five-item cap and that the Engine is untouched.

## Integrator expectations

Architectural: waits for Gavin to approve the merge (and the call list).

## Stop / escalation conditions

Stop if the call would need Engine input or a new stored field.
