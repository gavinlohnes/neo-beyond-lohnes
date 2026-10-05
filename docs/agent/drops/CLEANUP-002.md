---
id: CLEANUP-002
baseline: ca1c89973ced509943a4f13bd42fd63ed26cd4bd
risk_tier: ROUTINE
---

# CLEANUP-002 // GYM MODE AND TODAY POLISH (WALKTHROUGH FINDINGS 1–4, 11, 13)

## Mission

Fix the walk-through findings that affect gym mode and TODAY. Gavin's ruling 2026-10-04: "Let's do
B. All 13" (every finding in `docs/agent/WALKTHROUGH-001.md`); this Drop takes findings 1–4, 11 and
13 plus the sweep review's "failed UNDO shows no message". CLEANUP-003 takes the rest.

## Approved baseline

`origin/master` at `ca1c89973ced509943a4f13bd42fd63ed26cd4bd`.

## Risk classification

ROUTINE: UI and wording only, over existing commands. No Engine, schema, event or dependency change.

## Authorized scope

- **Gym mode (1, 2):** a "Last set" line under the controls: the session's most recent set
  ("Machine Chest Press #1 — 110 × 10" or "skipped"), with the quiet PR tag when it's a record, and
  UNDO (TRAIN's own handleUndoLastSet).
- **TODAY lines under the header (3):** the backup, sweep, handoff and capsule lines render inside
  TODAY right under "BEYOND // TODAY" (a `banners` slot), not above it.
- **One place for notes on a day off (4):** when the sweep line shows, Attention → CAPTURE says
  "2 notes waiting. SWEEP above takes them one at a time." instead of repeating the list; on work
  days the list stays. Attention's "→ OBLIGATION" / "CREATE OBLIGATION" / "Obligation created:"
  read "→ TASK" / "CREATE TASK" / "Task created:" to match the sweep's "MAKE IT A TASK".
- **Start card (11):** TODAY's dominant surface centers its contents vertically, so a short card
  (START DAY) doesn't leave an empty block underneath.
- **Sweep refresh (13):** changing the day's work context on TODAY re-reads the sweep line.
- **Sweep UNDO failure:** a failed UNDO shows "Couldn't bring it back. Try again."

## Explicit exclusions

No wording changes beyond those named (CLEANUP-003 has the rest); no new features.

## Relevant authority / references

`docs/agent/WALKTHROUGH-001.md`; NOTES-SWEEP-001 review notes; GYM-001.

## Required invariants

Gym mode logs and undoes through TRAIN's own handlers; capture conversion still creates an
obligation; the TODAY banners keep their behavior.

## Acceptance criteria

1. Gym mode shows the last set with a PR tag when it's a record; UNDO removes it.
2. The four TODAY lines render below the header.
3. On a day off with the sweep showing, Attention doesn't repeat the notes; work days unchanged.
4. TODAY says "task" consistently; the start card's content is centered.
5. Switching to a day off shows the sweep line without reopening TODAY.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff.

## Reviewer expectations

A separate session checks each item and that nothing else changed.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a fix needs a data or Engine change.
