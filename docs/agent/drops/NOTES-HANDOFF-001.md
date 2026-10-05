---
id: NOTES-HANDOFF-001
baseline: SET_AT_INIT
risk_tier: HIGH-RISK
---

# NOTES-HANDOFF-001 // SHIFT HANDOFF NOTE

## Mission

When Gavin ends a work period, BEYOND asks (optionally) "Note for next shift?"; what he writes
shows at the top of TODAY on his next work day. Owner brief 2026-10-04 ("Notes that go
somewhere"), rulings 1A (second of three) and 2A (stored like cue text).

## Approved baseline

Set to a fresh `origin/master` SHA before `factory-drop.mjs init`.

## Risk classification

HIGH-RISK: new stored data (backup contract). Owner storage ruling obtained (2A): a new event
type `SHIFT_HANDOFF_NOTED` {commandId, note} in the existing events table, written under the day
the work period ended; no `db.version` change, no new table. Gavin approves the merge.

## Authorized scope

- After END WORK PERIOD (the existing `WORK_PERIOD_ENDED` flow), an optional one-line field
  "Note for next shift?" with SAVE / SKIP; up to 280 characters.
- On the next day whose `workContext` is WORK, TODAY shows the latest unread handoff at the top:
  "From last shift: Truck 12 brakes still soft, check first thing." with GOT IT (records a
  `SHIFT_HANDOFF_READ` {commandId, handoffEventId} event so it stops showing).
- History words both plainly.

## Explicit exclusions

No reminders/notifications, no editing a saved handoff, no change to the work-period flow itself.

## Relevant authority / references

GYM-002 (event-stored user text, same pattern); `.claude/rules/persistence.md`.

## Required invariants

Older backups restore unchanged; a backup with handoffs restores them; nothing shows on days off.

## Acceptance criteria

1. Saving a handoff and opening the next work day shows it; GOT IT hides it for good.
2. Backup → restore keeps an unread handoff unread.
3. SKIP writes nothing; schema version unchanged.

## Required verification

`npm run verify` · `npx vitest run tests/compat/` · round-trip test · PR Verification green.

## Builder expectations

Build, verify, PR, handoff note.

## Reviewer expectations

Independent review of the event shape, back-compat and the round trip.

## Integrator expectations

High-Risk: Gavin approves the merge.

## Stop / escalation conditions

Stop on any change to an existing table's shape or the work-period flow's semantics.
