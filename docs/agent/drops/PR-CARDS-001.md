---
id: PR-CARDS-001
baseline: 5538f0f7750905baa8116a54cd9218a23a7be6ec
risk_tier: ROUTINE
---

# PR-CARDS-001 // PR RECORD CARDS

## Mission

A quiet PR tag and a TRAIN "Records" list. When a set is a PR, it shows a small red-outlined
**PR** tag (no fill, no sound, no vibration). Every PR is kept as a card in TRAIN → RECORDS:
exercise, what it beat ("Heaviest: 145 lb x 8"), date. Owner brief 2026-10-04 (Queue item 3).

## Approved baseline

`origin/master` at `5538f0f7750905baa8116a54cd9218a23a7be6ec` (update before init).

## Risk classification

ROUTINE: UI plus a read-only query over existing PR data (`engine/personalRecords.ts`
`findSessionRecords`, as the finish summary and Weekly already use). No new data.

## Authorized scope

- `application/personalRecordQueries.ts`: `getAllRecords()`, every PR from finished sessions,
  newest first, undone sets excluded, judged exactly as today's finish summary.
- TRAIN: the live PR line becomes a 1px red-outlined "PR" tag on the logged set; a RECORDS entry
  (TRAIN's existing overflow/tools area, not a new tab) opens the list of cards; one card per PR.
- Copy reuses `describePersonalRecord` without the "NEW PR — " prefix.

## Explicit exclusions

No sound/haptics, no new PR rule, no schema, no new tab, no sharing.

## Relevant authority / references

Drop 4 (live PR alerts, finish summary); Weekly's records list; owner likes some red.

## Required invariants

The same sets are PRs here as in the finish summary and Weekly (one rule).

## Acceptance criteria

1. Logging a PR set shows the outlined PR tag; no audio element or vibrate call exists.
2. RECORDS lists every PR card newest first; an undone PR set disappears.
3. Counts match the finish summary for the same sessions (test).
4. 320–412 px, no horizontal overflow.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Build, verify, PR `[NEEDS CLAUDE REVIEW] PR-CARDS-001: …`, handoff, stop.

## Reviewer expectations

Claude Code checks the single PR rule and no sound.

## Integrator expectations

Routine: merges on green checks (speed rule); Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a schema or new PR definition seems needed.
