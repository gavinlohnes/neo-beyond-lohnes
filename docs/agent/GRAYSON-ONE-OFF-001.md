# GRAYSON-ONE-OFF-001 — an empty one-off workout, and one tap from TODAY into the workout

- **Authorization:** Gavin, 2026-11-25. 05:03 CT: **"I think we need to get the basics pretty close to perfect before
  we start building all of this ontop of it."** 05:24 CT: **"Brief all of it."** His rule: **"I should be able to edit
  and tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (a session with no routine, the A, B, C turn, and a TODAY change). No new table and no Dexie
  version. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` with WORKOUT-CHANGES-001 merged. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-one-off-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code, TRAIN basics **#3** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It uses
  WORKOUT-CHANGES-001's ADD EXERCISE. **This is a TODAY change:** only one TODAY PR open at a time across both
  sessions, so check the Delta-track queue before opening it.

## Objective and benefit
Today (basics audit, Nov 25, flow 3), every workout starts from a routine. There's no empty workout, so a day of
"just arms" or a hotel gym means picking a routine and swapping everything. TODAY's workout card opens TRAIN but
doesn't start the workout (`WorkoutCall.tsx`), so starting takes another screen and another tap.

After this, TRAIN has **EMPTY WORKOUT**. He adds exercises as he goes, and at the end he can **SAVE AS ROUTINE** in
one tap. A one-off never moves his A, B, C turn. On TODAY, the planned workout's START begins it, and **START EMPTY**
sits beside it.

**Benchmark (read 2026-11-25):** Hevy's "Start Empty Workout" begins a log with no routine, and the finished workout
can be saved as a routine ([Hevy, start empty workout](https://www.hevyapp.com/features/start-empty-workout/)).
**What we copy:** the empty start and saving it as a routine. **What we add:** his A, B, C turn stays put, and TODAY
starts either in one tap.

## Recommended defaults (approved when Gavin merges this brief)
1. **EMPTY WORKOUT** on TRAIN's home, under the planned workout. It starts a STANDARD session with no routine
   (`startWorkout(dayId, null, "STANDARD")`), through the same RED-capacity check as any start.
2. **Inside it:** WORKOUT-CHANGES-001's ADD EXERCISE, with the three most recent exercises offered first. Rest starts
   from his rest memory; sets log exactly as in a routine.
3. **The A, B, C turn:** a one-off has no programme context, so the sequence's next member stays next. History shows it
   as "Workout (one-off)", or the name he gives it.
4. **SAVE AS ROUTINE** on the finish summary (one tap, then the name, which defaults to the date and the main muscle
   groups, for example "Arms · Nov 25"). It saves through `createCustomTemplate` with the sets, reps and rest he did,
   with UNDO. Saving doesn't add it to his programme; WEEK-PLAN-001 places it on a day.
5. **TODAY:** on a day with a planned workout, the card's **START** begins that workout and opens it live (not the
   TRAIN home). **START EMPTY** is a second, quieter button. On a rest day the card shows START EMPTY only. TRAIN's own
   flow still owns the RED override: if the day is RED, START opens TRAIN with the override question, as today.
6. **Tap bar:** from TODAY, start the planned workout in 1 tap and an empty one in 1. Save a one-off as a routine in 2
   (SAVE AS ROUTINE, SAVE with the default name).

## Everything is his to change
The one-off's exercises, its name in History, whether to save it, the routine's name; the routine afterwards through
ROUTINE-EDIT-001.

## Design principles check (Vision, Nov 24)
- **One tap for the usual:** START on TODAY. **Simple first:** an empty workout is a blank page with ADD EXERCISE.
  **Calm:** nothing asks to save unless he taps it.

## Scope
- `application/trainCommands.ts` (an empty start; a guard that a session with no template never advances the
  sequence), `application/` (`saveSessionAsRoutine`), the finish summary and the home in `TrainScreen.tsx`,
  `WorkoutCall.tsx` (START and START EMPTY), `historyCopy.ts`.
- Tests: an empty start makes a live session with no exercises; ADD works there; the A, B, C next member doesn't move
  after a one-off; SAVE AS ROUTINE creates a custom routine with the sets, reps and rest done, with UNDO; TODAY's START
  starts the planned workout and opens it live; START EMPTY on a rest day; a RED day still asks the override in TRAIN;
  an active session already open is resumed, not doubled; 320 px and axe on TODAY's card and the summary.

## Excluded
Placing the saved routine on the week (WEEK-PLAN-001). Changing the sequence. Running sessions (they keep their own
start).

## Acceptance
- Phone check: on TODAY, tap START: your planned workout is live. Finish it. Tomorrow, tap START EMPTY, add curls and a
  triceps pushdown, finish, SAVE AS ROUTINE. It's in your routines; TRAIN still says your next sequence workout is the
  same one as before.

## Decision record
- A one-off never moves the A, B, C turn, because an extra day shouldn't skip a planned one.
- TODAY starts the workout instead of only opening TRAIN, because the start is the usual job.

## Stop and ask Gavin if
- Starting from TODAY would skip a check TRAIN does today (capacity, an active session, a linked short or home form).

## Risks
- **A doubled session:** the in-flight start guard in `startWorkout` is kept, with a test for two taps.
