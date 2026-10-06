---
id: SHORTCUTS-001
baseline: 473dd1999a52d7357433e82e8f5a005b3dc1cb0e
risk_tier: ROUTINE
---

# SHORTCUTS-001 // HOME-SCREEN ICON SHORTCUTS

## Mission

Owner brief 2026-10-05, item 4. Long-pressing the app icon offers START WORKOUT, +WATER and LOG
MEAL, each opening straight to that action. Example: START WORKOUT opens TRAIN at the workout
start (or the workout already in progress) instead of TODAY.

## Approved baseline

`origin/master` at `473dd1999a52d7357433e82e8f5a005b3dc1cb0e`.

## Risk classification

ROUTINE: manifest shortcuts and the existing `?go=` routing (`src/ui/shortcuts.ts`).

## Authorized scope

- Manifest shortcuts become exactly: START WORKOUT (`?go=workout`), +WATER (`?go=water`), LOG MEAL
  (`?go=meal`).
- `?go=workout` opens TRAIN's workout destination (resuming an active workout if there is one).
  `?go=water` opens BODY at the water quick-add; `?go=meal` opens BODY's meal entry.
- Old `?go=weight` / `?go=urge` links keep working for shortcuts already pinned on a phone.

## Explicit exclusions

A shortcut never logs or starts anything by itself (Drop 7 ruling): the tap on the screen does.

## Relevant authority / references

Owner brief 2026-10-05; Drop 7 shortcut ruling (2026-10-01).

## Required invariants

A shortcut still wins over workout continuity on launch, as today.

## Acceptance criteria

1. The manifest lists exactly the three shortcuts (test).
2. Each `?go=` value opens the right screen and control (test).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff with DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks each shortcut's destination and that nothing logs by itself.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a shortcut would need to write data on open.
