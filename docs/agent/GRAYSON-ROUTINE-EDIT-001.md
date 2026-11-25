# GRAYSON-ROUTINE-EDIT-001 — edit any routine from TRAIN, A, B and C included, with undo and a reset

- **Authorization:** Gavin, 2026-11-25. 05:03 CT: **"I think we need to get the basics pretty close to perfect before
  we start building all of this ontop of it."** 05:21 CT, on making A, B and C editable with a one-tap reset: **"Yes,
  with rest."** 05:24 CT: **"Brief all of it."** His rule: **"I should be able to edit and tweak or correct everything
  in this app."** Merging this brief approves the defaults below, including lifting the Decision Register's "locked
  word for word" rule for the built-in A, B and C.
- **Lane: PROTECTED** (prescriptions, the programme snapshot and a Decision Register change). No new table and no Dexie
  version. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `a2c33c53` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-routine-edit-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code, TRAIN basics **#1** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25).
  WORKOUT-CHANGES-001, ONE-OFF-001, WEEK-PLAN-001 and BLOCK-CYCLE-001 build on its editor and commands.

## Objective and benefit
Today, changing a routine is the hardest everyday job in TRAIN (basics audit, Nov 25, flow 1):
- The built-in A, B and C (`WORKOUT_TEMPLATES`, `domain/workout/types.ts`) can't be changed at all.
- His own routines live in MORE · Custom programs (`CustomTemplateScreen.tsx`). The order is the order he ticked them,
  so reordering means unticking and reticking, and the sets reset to 3. There's no swap.
- Reps come only from each exercise's own range in the library. Rest can't be set in a routine.
- The programme keeps a snapshot of each A, B and C member (`SequenceProgrammeMember.snapshot`). An edit to a member's
  template marks the programme CHANGED, and TRAIN won't start that member until he reviews the sequence again
  (`trainingProgramme.ts`, `trainingProgrammeQueries.ts`).

After this, every routine opens in one editor inside TRAIN. From the workout card he taps **EDIT**, then adds, removes,
moves or swaps exercises and sets each one's sets, rep range and rest. SAVE applies it to the programme in the same
step, and UNDO puts it back. A, B and C each have **RESET TO ORIGINAL**.

**Benchmark (read 2026-11-25):** Hevy: "Tap the three dots next to any movement" to "reorder, replace, or remove the
movement", and "Edit Routine" changes "any of the training variables, including the exercises, number of sets, rep
targets, and rest periods" ([Hevy, track workouts](https://www.hevyapp.com/features/track-workouts/)). **What we copy:**
one editor and a menu on each exercise. **What we add:** UNDO on every save, a reset to the original, and the programme
staying in step with the edit. **What we keep out:** folders, sharing and routine libraries.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where:** an **EDIT** button on the workout card in TRAIN (before START) for the routine shown, and on each routine
   in a **ROUTINES** list one tap from TRAIN's home. MORE · Custom programs opens the same editor.
2. **The editor:** each exercise on one row with its sets, rep range and rest, and a menu with **MOVE UP**, **MOVE
   DOWN**, **SWAP** and **REMOVE**. **ADD EXERCISE** at the bottom searches the whole library (his own exercises first),
   so he never saves an exercise to his library first. Superset with next stays as today.
3. **Per exercise:** sets 1 to 10, rep range 1 to 50 (low at or below high), rest 15 s to 10 min (the rest memory's
   bounds, `restMemory.ts`). Rest set here is the start; his ± taps during a workout still adjust it, as today.
4. **A, B and C:** editing one saves an override for that built-in through a new event, `ROUTINE_EDITED {commandId,
   templateId, exercises}` (no day, USER); the latest wins. The code's `WORKOUT_TEMPLATES` never change, so **RESET TO
   ORIGINAL** writes the code's version back as a new event, with UNDO. Exercise ids stay the same, so history and
   progression stay continuous.
5. **His custom routines:** saved through `updateCustomTemplate`. The previous version is kept on the event so UNDO and
   a reset to "as first saved" work.
6. **The programme stays in step:** saving a routine that is an active sequence member (or its SHORT or HOME link)
   writes the new programme revision with the new snapshot in the same command. The CHANGED state never appears from an
   edit made here. A programme member edited elsewhere still shows CHANGED, as today.
7. **Progression:** an exercise kept keeps its history. A swapped-in exercise starts from its own history, or from no
   suggestion when it has none. Increments come from `deriveIncrementLbs`, as today.
8. **Tap bar:** change one exercise's sets, reps or rest in 3 taps from the workout card. Move an exercise one place in
   2 taps. Add an exercise in 3 taps when it's among his own.

## Everything is his to change
Every routine, A, B and C included, each exercise, its sets, reps and rest; RESET TO ORIGINAL; UNDO on every save.

## Design principles check (Vision, Nov 24)
- **Yours to change:** the last locked part of TRAIN opens. **Fix, don't ask:** SAVE then UNDO, no confirm dialog.
  **Simple first:** one editor, in TRAIN.

## Scope
- `domain/workout` (`applyRoutineEdit`, validation), `domain/common/types.ts` (event type), `application/`
  (`saveRoutineEdit`, `resetRoutine`, `undoRoutineEdit`; read the latest override in `exercisesFor`'s resolver and
  `customTemplateQueries.resolveTemplateDefinition`), `application/trainingProgramme.ts` (new revision with the new
  snapshot in the same transaction), `restMemory.ts` (a routine's rest as the start), `historyCopy.ts`.
- UI: a `RoutineEditor` in TRAIN (+ css); `CustomTemplateScreen.tsx` opens it; the EDIT button on the workout card.
- Docs: the Decision Register entry for the built-in TRAIN templates says they're editable with a reset (Gavin,
  2026-11-25).
- Tests: an edit to A changes the next A and nothing earlier; RESET TO ORIGINAL restores the code's A, and UNDO undoes
  the reset; reorder keeps each exercise's sets; a swapped exercise keeps no foreign history; editing an active member
  writes the new snapshot so it starts with no review; an edit made outside the editor still shows CHANGED; rest set
  in the routine is the first rest and ± still adjusts it; bounds refused; native backup round-trip and an older backup
  imports; 320 px and axe on the editor, keyboard reorder.

## Excluded
Adding or swapping during a live workout (WORKOUT-CHANGES-001). Empty workouts (ONE-OFF-001). The weekly plan
(WEEK-PLAN-001). New set types or timed sets. Folders or sharing.

## Acceptance
- Phone check: on TRAIN, tap EDIT on A, move the second exercise to the top, set its rest to 2:00 and SAVE. START: it's
  first, and the rest timer starts at 2:00. UNDO the edit: A is as it was.
- RESET TO ORIGINAL on A brings back the original A.
- Edit your programme's A: TRAIN still starts it without asking you to review the sequence.

## Decision record
- Built-in routines change through an override event, so the original is always one tap away.
- An edit made in the editor updates the programme in the same step, because a routine he just edited shouldn't block
  his next workout.

## Stop and ask Gavin if
- A saved edit would change a workout already in progress (the edit should apply from the next one).

## Risks
- **Lost history:** exercise ids are kept across edits and swaps never inherit history, with tests.
