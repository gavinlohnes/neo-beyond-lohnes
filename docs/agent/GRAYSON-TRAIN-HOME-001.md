# GRAYSON-TRAIN-HOME-001 — TRAIN as the one home for training

- **Authorization:** Gavin, 2026-11-27, 07:41 CT: **"Yes, brief it"**, answering "My pick is to make TRAIN the one home
  for training: add LIBRARY beside ROUTINES and THIS WEEK, since today it lives only in MORE; fold MORE's CUSTOM
  PROGRAMS into ROUTINES, and rename MORE's shift checklists to SHIFT ROUTINES. Nothing you've logged changes. Should I
  brief it as X3 for the TRAIN builder, after T7?" This is Launch 1.0 row X3, which was "a short check, then maybe a
  brief". His standing rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this
  brief approves the defaults below.
- **Lane: FEATURE** (navigation and labels only: no stored data, event, table or Dexie version changes). For Launch
  1.0, Gavin still merges, after green CI and a fresh-context reviewer's exact-head PASS posted on the PR.
- **Starting commit:** latest `origin/master` with T7 (GRAYSON-OPEN-LIBRARY-001) merged, because T7 changes the
  library screen this brief links to. Re-fetch before starting.
- **Builder:** Claude Code, TRAIN lane (the "Project GRAYSON TRAIN builder" chat). Branch
  `claude/grayson-train-home-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** row X3 in the Launch 1.0 table of [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md), after T7.

## Objective and benefit
The check on master `234c1202` (after T5) found that TRAIN already holds almost everything for training: START, EDIT,
ROUTINES, THIS WEEK, EMPTY WORKOUT, MY PROGRAMME, and the WORKOUT · HISTORY · RECORDS · PROGRESS switcher, with blocks
under PROGRESS. Two things are off:

- **The exercise library lives only in MORE** (`MoreScreen.tsx` view `EXERCISE_LIBRARY`). From TRAIN he reaches it
  only while adding an exercise to a routine.
- **"Routines" means two things.** In TRAIN, ROUTINES are his workouts (`RoutineEditor.tsx`). In MORE, ROUTINES are
  his before, during and after shift checklists (`components/RoutinesPanel.tsx`, `systemCatalog.ts` "Your before,
  during and after shift routines"). And MORE's CUSTOM PROGRAMS (`CustomTemplateScreen.tsx`) is his workouts again,
  under a third name.

Hevy keeps routines and "+ Start Empty Workout" together on its "Workout tab"
([Hevy help: how to log a workout](https://help.hevyapp.com/hc/en-us/articles/35361530647959-How-to-Log-a-Workout-in-the-Hevy-App-Step-by-Step-Guide)).
After this, everything about training is on TRAIN, and each thing has one name.

## Recommended defaults (approved when Gavin merges this brief)
1. **LIBRARY on TRAIN.** A LIBRARY button joins the row with ROUTINES and THIS WEEK in TRAIN's start area. It opens
   the same `ExerciseLibraryScreen` (with T7's search and "Show stretches") inside TRAIN, with a way back to the
   workout. One tap from TRAIN.
2. **One name for workouts: ROUTINES.** MORE's CUSTOM PROGRAMS entry is renamed ROUTINES · WORKOUTS and opens TRAIN's
   routines list, so there is one list. ARCHIVE, which today lives only in CUSTOM PROGRAMS, moves into TRAIN's routines
   list, one tap per routine with UNDO. Archived routines still show under "Archived" there.
3. **SHIFT ROUTINES.** MORE's shift checklists are relabelled SHIFT ROUTINES everywhere he reads the name: the MORE
   entry, its screen header (`MORE // SHIFT ROUTINES`) and its catalog description. Anything that opens them from
   TODAY keeps working.
4. **Search finds both.** In MORE's search, "routine" finds both SHIFT ROUTINES and ROUTINES · WORKOUTS; "program",
   "template" and "workout" find the workout routines; "library", "exercise" and "lift" find LIBRARY.
5. **Labels only.** Internal keys stay as they are (`MoreView` `"ROUTINES"`, `"CUSTOM_TEMPLATES"`,
   `"EXERCISE_LIBRARY"`, the `"ROUTINE"` source kind in `App.tsx`), so links, shortcuts and history keep working.
6. **Taps:** the library from TRAIN in 1 tap; archive a routine in 2 (open the list, ARCHIVE).

## Everything is his to change
Nothing here stores anything new. His routines, shift routines and exercises stay exactly as they are, and every
existing edit, archive and undo still works. If he wants other names, they're one-line label changes.

## Design principles check (Vision, Nov 24)
- **Simple first:** one place for training, one name per thing. **Calm:** no new cards, badges or prompts.

## Scope
- `TrainScreen.tsx` (one button in the start row, mount only); a small TRAIN library view that wraps
  `ExerciseLibraryScreen`; `RoutineEditor.tsx` routines list (ARCHIVE using `archiveCustomTemplate`, with UNDO);
  `MoreScreen.tsx` and `systemCatalog.ts` labels, descriptions and aliases; `CustomTemplateScreen.tsx` becomes a
  redirect to TRAIN's routines list (or is removed if nothing else opens it).
- Tests: LIBRARY opens from TRAIN and comes back; MORE's ROUTINES · WORKOUTS opens TRAIN's routines; ARCHIVE in TRAIN
  archives and UNDO restores; SHIFT ROUTINES label in MORE and in its header; TODAY's link to a shift routine still
  opens it; search aliases as in default 4; existing MoreScreen, MoreOperator, CommandCatalog and systemCatalog tests
  updated to the new labels, none deleted; 320 px and axe.

## Excluded
Moving SHIFT ROUTINES out of MORE. Merging the TRAIN sub-views (WORKOUT, HISTORY, RECORDS, PROGRESS). Any change to
the four tabs.

## Acceptance
- **Phone check:**
  - On TRAIN, tap LIBRARY, find an exercise, and come back to your workout.
  - In MORE, ROUTINES · WORKOUTS opens the same routines as TRAIN's ROUTINES.
  - Archive a routine from TRAIN, then UNDO.
  - MORE now says SHIFT ROUTINES, and your checklists are all there.

## Decision record
- Labels change, keys don't, so nothing he has saved or linked breaks.
- ARCHIVE moves into TRAIN because CUSTOM PROGRAMS was its only home.

## Stop and ask Gavin if
- Anything outside MORE's own screens (TODAY, Delta lines, notifications) calls the shift checklists "routines" in a
  way he'd read. List each place and the proposed words before changing them.

## Risks
- **Tests pinned to old labels:** update them to the new labels; don't delete them.
