---
id: VIEWS-001
baseline: SET-AT-ACTIVATION
risk_tier: ROUTINE
---

# VIEWS-001 // DATA VIEWS

## Mission

Owner brief 2026-10-05, item 5. Tap a number to see its story. Example: tapping "Machine Chest
Press" in TRAIN → RECORDS shows its strength curve over time with each PR marked.

## Approved baseline

Set at activation to fresh `origin/master`.

## Risk classification

ROUTINE: read-only views over existing data (inline SVG, as the BODY timeline does). Trend charts
for lifts and Weekly fall under the 2026-10-05 brief.

## Authorized scope

- **Strength curve:** tapping a lift in TRAIN → RECORDS opens its curve: the heaviest set per
  finished session over time, PR sessions marked, read only, with a CLOSE.
- **12-week heat grid** in Weekly, behind a tap ("SHOW 12 WEEKS"): one cell per day, marked by
  what was trained (strength / recovery / none), text labels for accessibility.
- Views open from a tap and never add rows to a screen.

## Explicit exclusions

"Your usual" bands wait until the F1 stop ends (~Oct 25). No Engine input; no new data.

## Relevant authority / references

Owner brief 2026-10-05; BODY-TIMELINE-001 (chart pattern); PR-CARDS-001 (PR rule).

## Required invariants

PRs on the curve use the same rule as the finish summary and RECORDS; screen row counts unchanged.

## Acceptance criteria

1. A lift with sessions shows a curve with its PRs marked; with one session it says so plainly.
2. Weekly's grid covers 84 days ending today and is closed by default.
3. No screen gains a row (tests).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks the PR marking against RECORDS and read-only behavior.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a view needs a new stored field.
