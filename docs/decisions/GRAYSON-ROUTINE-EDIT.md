# GRAYSON-ROUTINE-EDIT — every routine is his to edit, A, B and C included (owner go, 2026-11-25)

Gavin approved the [brief](../agent/GRAYSON-ROUTINE-EDIT-001.md) ("Yes, with rest"; "Brief all of it"; "I should be
able to edit and tweak or correct everything in this app"). Merging it lifts the old rule that the built-in A, B and C
were locked word for word (the `WorkoutTemplateId` comment in `domain/workout/types.ts`, the "Fixed A/B/C templates"
row in the Integrated Health Mission, and the TRAIN-CREATE-001 entry in `docs/UX_DECISIONS.md`).

- **A, B and C are editable with a reset.** An edit is a `ROUTINE_EDITED` event (global, USER) and the latest one
  wins. The code's `WORKOUT_TEMPLATES` never change, so RESET TO ORIGINAL writes the code's version back as a new
  event, and that can be undone too. Exercise ids are kept, so history and progression stay continuous.
- **His own routines** still change in place; the same event keeps the version it replaced, for UNDO and RESET TO AS
  FIRST SAVED.
- **One editor** in TRAIN (EDIT on the workout card; ROUTINES), also opened by MORE · Custom programs: sets 1–10,
  reps 1–50 (low ≤ high), rest 15 s–10 min or his usual, order, swap, remove, add from his exercises, then A/B/C's own
  movements, then the bundled library. SAVE then UNDO; no confirm dialog.
- **Rest:** a routine's rest is where that exercise's rest starts in each workout; a ± tap still moves it and the
  remembered rest, and his adjusted length holds for the rest of that workout.
- **A workout in progress keeps its exercises.** Its routine is read as it was when it started; an edit applies from
  the next one.
- **The programme stays in step.** Saving a routine that is an active sequence member (or its SHORT or HOME link) and
  matched its snapshot writes the next programme revision in the same transaction, starting from the member the
  sequence names next. An edit made elsewhere still shows CHANGED. When the sequence can't name its next member
  (UNKNOWN), no revision is written and the existing review stands.
- **Progression is unchanged:** a kept exercise keeps its history; a swapped-in one starts from its own (none means no
  suggestion). REDUCED is still the first two exercises, two sets each.
