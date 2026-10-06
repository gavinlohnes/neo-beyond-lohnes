---
id: STATUS-001
baseline: a6d204437a74681057162f7475c25b24ef3a33bc
risk_tier: ARCHITECTURAL
---

# STATUS-001 // SYSTEM STATUS

## Mission

Owner brief 2026-10-05, item 6 (approved merge: System Status is one line on TODAY). One line
reads GREEN / AMBER / RED plus a one-line reason, built from sleep, check-in and recent training
load. Example: "AMBER · 5h sleep, 3 hard sessions in 4 days."

## Approved baseline

`origin/master` at `a6d204437a74681057162f7475c25b24ef3a33bc`.

## Risk classification

ARCHITECTURAL: a new TODAY line and a new deterministic status rule. The rule is pure and lives
outside the Engine; it never changes or feeds a recommendation.

## Authorized scope

- A pure function (`src/application/systemStatus.ts` or similar) over: last main sleep (hours),
  today's check-in capacity (the existing `deriveCapacity`), finished strength sessions in the last
  4 days. Proposed rule, for Gavin's sign-off at merge:
  - **RED** if the check-in reads RED, or last main sleep < 4 h.
  - **AMBER** if the check-in reads YELLOW, last main sleep < 6 h, or 3+ finished strength
    sessions in the last 4 days.
  - **GREEN** otherwise, when at least sleep or a check-in is on record.
  - With neither sleep nor a check-in: "NO READ · log sleep or check in" (never a guessed color).
- The reason lists only the facts that set the color, e.g. "AMBER · 5h sleep, 3 hard sessions in 4 days".
- One line in TODAY's header strip (under the phase heading), so no phase row is added.
- Text label plus color (accessibility); facts only, no shame words.

## Explicit exclusions

No Engine, recommendation, capacity or threshold change elsewhere; not a notification.

## Relevant authority / references

Owner brief 2026-10-05; Command Center Rules 3–4; adherence-neutral design rule; doctrine (red
must be earned, accessibility).

## Required invariants

Engine output identical with and without the line (test); TODAY phase rows unchanged.

## Acceptance criteria

1. Each color fires on the stated facts; the reason names only those facts (unit tests).
2. No data → NO READ, not GREEN (test).
3. Shown once on TODAY with a text label (test).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · `npm run check:risk -- <baseline>` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, Standard report, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks the rule against this contract and that the Engine is untouched.

## Integrator expectations

Architectural: waits for Gavin to approve the merge (and the thresholds).

## Stop / escalation conditions

Stop if the line would need to change what the Engine recommends.
