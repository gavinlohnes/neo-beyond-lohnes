---
id: NOTES-SWEEP-001
baseline: 8f0565a04e9dee0485fbd6072b7cfe98e0ae8527
risk_tier: ROUTINE
---

# NOTES-SWEEP-001 // DAY-OFF NOTES SWEEP

## Mission

On a day off, TODAY offers a quick sweep of open captured notes, one at a time. Owner brief
2026-10-04 ("Notes that go somewhere"), rulings 1A (three Drops: sweep first) and 3 "A and B"
(choices DONE / MAKE IT A TASK / KEEP, plus DELETE).

## Approved baseline

`origin/master` at `8f0565a04e9dee0485fbd6072b7cfe98e0ae8527`.

## Risk classification

ROUTINE: a UI flow over existing capture commands (`resolveCaptureItem`,
`convertCaptureToObligation`, `reopenCaptureItem`). DELETE removes a capture row through a new
`deleteCaptureItem` command with an UNDO that restores the same row (captures are directly
mutable configuration-style rows, not events, so no history is rewritten). No schema change.

## Authorized scope

- A line above TODAY when the active day is a day off (`workContext === "OFF"`) and open notes
  exist: "Sweep your notes · 6 waiting" with SWEEP. Hidden on work days and when no notes wait.
- SWEEP shows one note at a time (text, when captured, "2 of 6"), with:
  - **DONE**: resolves it (`resolveCaptureItem`).
  - **MAKE IT A TASK**: turns it into an obligation titled with the note's text
    (`convertCaptureToObligation`).
  - **KEEP**: leaves it open; moves on.
  - **DELETE** (hold to confirm, like DELETE on a logged entry): removes it, with UNDO right after.
- The end says what happened: "Swept 6: 3 done, 1 task, 1 kept, 1 deleted." TODAY refreshes so
  its CAPTURE count matches.

## Explicit exclusions

No new stored data, no automatic sweeping, no change to capture on work days, no handoff or time
capsule (NOTES-HANDOFF-001, NOTES-CAPSULE-001).

## Relevant authority / references

`docs/UX_DECISIONS.md` capture entries ("capture first, organize second"); DELETE precedent
(hold DELETE on a logged entry, with confirmation).

## Required invariants

Every action uses the existing capture/obligation commands; KEEP writes nothing; DELETE is
undoable until the sweep moves past it.

## Acceptance criteria

1. The line shows only on a day off with open notes.
2. Each choice does what it says (test per choice); KEEP writes nothing.
3. DELETE needs a hold; UNDO brings the same note back.
4. The summary counts are right; TODAY's capture count updates.
5. 320–412 px, no overflow; buttons ≥ 44 px.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff.

## Reviewer expectations

A separate session checks each choice's effect, that DELETE needs a hold and undoes, and that
nothing changes on work days.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if the sweep needs a schema change or would change how captures behave elsewhere.
