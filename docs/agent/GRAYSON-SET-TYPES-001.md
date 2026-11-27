# GRAYSON-SET-TYPES-001 — timed sets, drop sets and failure sets

- **Authorization:** Gavin, 2026-11-26, 03:40 CT, picking **"Brief all four"** for "what fits now, a protein heads-up,
  timed and drop sets, and the 800-exercise library". 2026-11-25, 06:50 CT: **"I think the first 2 area we get to being
  above amazing is nutrition and Train."** Nov 24: TRAIN must fully replace Hevy, MuscleWiki and Couch to 5K. His rule:
  **"I should be able to edit and tweak or correct everything in this app."** Merging this brief approves the defaults
  below.
- **Lane: PROTECTED** (new optional fields on the logged-set event and the PR, progression and stall rules that read
  it). No new table or Dexie version; optional fields only, so every older event and backup reads unchanged.
  Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` with the five TRAIN basics (GRAYSON-TRAIN-BASICS B1–B5) merged. Re-fetch before
  starting. Built from `234c1202` (BLOCK-CYCLE-001 merged as #746).
- **Builder:** Claude Code, TRAIN lane. Branch `claude/grayson-set-types-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code, after the TRAIN basics, in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md).

## Objective and benefit
A set today is a weight and reps, marked working or warm-up (`PerformedSet.setKind`, `domain/workout/types.ts`). He
can't log a plank or a dead hang by time, a drop set reads as a strange extra working set, and a set taken to failure
looks like any other.

After this, each set can be one of four kinds, picked with one tap on the set's number, the way Hevy does it (the
[Hevy Play listing](https://play.google.com/store/apps/details?id=com.hevy) lists warm-up, drop and failure sets):

- **Working** (as today) and **Warm-up** (as today).
- **Drop:** a lighter set straight after the one above it, with no rest timer between them.
- **Failure:** a working set he took to failure.

And an exercise can be **timed** instead of counted: the set shows a timer in place of reps, buzzes at his target time,
and logs how long he held it.

We go past Hevy by saying what each kind does to his numbers, right where he picks it: "Drop sets count in volume, not
toward your best or your next weight."

## Recommended defaults (approved when Gavin merges this brief)
1. **Kinds:** `setKind?: "WORKING" | "WARMUP" | "DROP" | "FAILURE"`. Missing still means WORKING. Tapping the set
   number cycles or opens a four-choice picker; it can be changed after the set is logged, through the existing
   correction path (`correctsSetId`) with UNDO.
2. **Drop sets:** `dropOf?: string` points at the set above. ADD DROP on a logged working set adds one at 20% less
   weight (rounded to his plate step), same reps target, and skips the rest timer. They count in volume and sets per
   muscle; they never set a best, an estimated one-rep max, a progression step or a stall.
3. **Failure sets:** count as working sets everywhere. Reps in reserve is set to 0 and shown. Progression reads them
   like any working set.
4. **Timed exercises:** `measure?: "REPS" | "TIME"` on `LibraryExercise` and his own exercises (default REPS). A timed
   set logs `durationSec` (and weight if he adds one). Target time default 30 s, his to change per exercise.
5. **Timer:** START counts up on screen and buzzes once at the target (`feedback.ts`, the same buzz the rest timer
   uses); he taps DONE to log the time held. He can type the time instead.
6. **Bests for timed sets:** longest time held, per weight. Progression for a timed exercise suggests +5 s once he hits
   the target on every working set, the same rule shape the rep ranges use.
7. **History, export and Delta** show the kind in words ("drop", "to failure", "0:45").
8. **Tap bar:** mark a set as drop or failure in 1 tap; add a drop set in 1 tap; a timed set in 2 taps (START, DONE).

## Everything is his to change
The kind of every set, before or after logging. Whether an exercise is timed. The target time. The drop-set step (in
MORE · Train settings, 5 to 50%).

## Design principles check (Vision, Nov 24)
- **Always says why:** what each kind does to his numbers, said where he picks it. **Fix, don't ask:** change a set's
  kind afterwards with UNDO. **Simple first:** every set starts as Working.

## Scope
- Types: `setKind` widened; `dropOf?`, `durationSec?` on `PerformedSet` and `SetLoggedPayload`; `measure?` and target
  time on library and custom exercises; validation in persistence accepts old and new rows.
- Engine: `isWorkingSet` gains a sibling `countsTowardBest(set)` (WORKING and FAILURE, not DROP or WARMUP);
  `personalRecords.ts`, `progression.ts` and `stall.ts` use it; volume keeps counting DROP.
- UI: the set kind picker and ADD DROP in the logging screen; the timed set row; the exercise editor's "Timed" switch.
- Tests: old events read as WORKING; each kind's effect on bests, estimated max, progression, stall and volume; ADD DROP
  weight and rounding; no rest timer before a drop; a timed set logs seconds and buzzes at target; longest-time best;
  +5 s progression; correcting a kind with UNDO; export and history wording; 320 px and axe.

## Excluded
Rest-pause and cluster sets. Distance-based sets (running stays where it is). Supersets (already built, SUPERSET-001).

## Acceptance
- Phone check: in a workout, tap a set number and pick Failure; it shows "to failure". Log a working set, tap ADD DROP:
  a lighter set appears with no rest timer. Mark an exercise Timed, START a set, hold, DONE: it logs the time. Your best
  and next weight ignore the drop set.

## Decision record
- Drop sets stay out of bests and progression, because a lighter set straight after a heavy one isn't a fair test.
- Optional fields on the existing event, because a new event type would split his history.

## Stop and ask Gavin if
- Any existing best or progression suggestion would change for workouts he has already logged.

## Risks
- **Rewriting his history:** old sets keep their meaning; tests pin every engine output on a fixture of today's events.
