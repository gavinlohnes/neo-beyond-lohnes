---
id: NOTES-CAPSULE-001
baseline: cc28335df2d9e67ba9a27a8511196ef0b6d86e18
risk_tier: HIGH-RISK
---

# NOTES-CAPSULE-001 // TIME CAPSULE

## Mission

A note to future Gavin that opens on a date he picks (1 month, 3 months, 6 months or 1 year)
and appears on TODAY that day. Owner brief 2026-10-04 ("Notes that go somewhere"), rulings 1A
(third of three) and 2A (stored like cue text).

## Approved baseline

`origin/master` at `cc28335df2d9e67ba9a27a8511196ef0b6d86e18`.

## Risk classification

HIGH-RISK: new stored data (backup contract). Owner storage ruling obtained (2A): a new event
type `TIME_CAPSULE_SEALED` {commandId, note, opensOn (local date)} in the existing events table, not
tied to a day (no `beyondDayId`, like Decision Journal events);
opening records `TIME_CAPSULE_OPENED` {commandId, capsuleEventId}. No `db.version` change, no new
table. Gavin approves the merge.

## Authorized scope

- MORE → a TIME CAPSULE row: write a note (up to 500 characters), pick 1 month / 3 months /
  6 months / 1 year, SEAL. It lists sealed capsules by opening date only (the text stays hidden
  until then).
- On or after `opensOn`, TODAY shows "A note from Jul 4 opened today" with the text and GOT IT
  (records `TIME_CAPSULE_OPENED`).
- History words both plainly.

## Explicit exclusions

No notifications, no editing or reading a sealed capsule early, no sharing.

## Relevant authority / references

GYM-002 (event-stored user text); `.claude/rules/persistence.md`.

## Required invariants

Older backups restore unchanged; sealed capsules survive backup → restore still sealed.

## Acceptance criteria

1. A sealed capsule's text never shows before its date; it shows on TODAY on/after it.
2. GOT IT stops it showing; backup → restore keeps sealed/opened state.
3. Schema version unchanged.

## Required verification

`npm run verify` · `npx vitest run tests/compat/` · round-trip test · PR Verification green.

## Builder expectations

Build, verify, PR, handoff note.

## Reviewer expectations

Independent review of the event shape, back-compat, and that early text never renders.

## Integrator expectations

High-Risk: Gavin approves the merge.

## Stop / escalation conditions

Stop on any change to an existing table's shape.
