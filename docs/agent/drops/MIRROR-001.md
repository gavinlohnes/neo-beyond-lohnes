---
id: MIRROR-001
baseline: e8c391d7fb5a2ab5280f09d11677e025580e6765
risk_tier: ROUTINE
---

# MIRROR-001 // THE MIRROR

## Mission

Owner brief 2026-10-05, item 9 (approved merge: the Mirror lives in Weekly). You now vs 30 and 90
days ago: weight trend, top lifts, average sleep, clean days. Example: "Weight 212.4 → 205.1 lb
(90 days)"; with no weigh-in that far back it reads "not enough data yet".

## Approved baseline

`origin/master` at `e8c391d7fb5a2ab5280f09d11677e025580e6765`.

## Risk classification

ROUTINE: read-only comparison in Weekly over existing data.

## Authorized scope

- A MIRROR section in Weekly, closed by default: now, 30 days ago, 90 days ago for
  weight (7-day average around each date), top lifts (heaviest set on record by that date, top 3
  lifts by sessions), average sleep (7 days ending each date), clean days (count in the 30 days
  ending each date).
- Any value without data reads "not enough data yet"; nothing is estimated.

## Explicit exclusions

No targets, no judgment words, no Engine input.

## Relevant authority / references

Owner brief 2026-10-05; adherence-neutral rule; NO_FAKE_PRECISION.

## Required invariants

Read only; Weekly gains one closed row.

## Acceptance criteria

1. Values match seeded data at 0/30/90 days (test).
2. Missing data reads "not enough data yet" (test).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks the windows and the honest empty states.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a value would need estimation.
