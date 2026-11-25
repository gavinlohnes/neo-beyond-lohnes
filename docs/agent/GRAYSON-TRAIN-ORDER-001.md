# GRAYSON-TRAIN-ORDER-001 — keep the order you lifted in, for next time

- **Authorization:** Gavin, 2026-11-24. Backlog row **B9** (SHAPE): "Mostly built: the jump rail already lets him do
  exercises in any order. Left: the new order isn't saved for next time" (`/mnt/project-files/grayson/BACKLOG.md`, TRAIN
  row 27). His rule: **"I should be able to edit and tweak or correct everything in this app."** 04:38 CT: **"Work on
  finishing train"**. Merging this brief approves the defaults below.
- **Lane: PROTECTED** (a new stored event that changes the order a workout is prescribed in). No new table, no Dexie
  version, no change to sets, reps, loads or progression. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `135e7b9e` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-train-order-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#20** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It touches
  `TrainScreen.tsx`, so it rebases on any open TRAIN PR.

## Objective and benefit
In a live workout the jump rail (`TrainScreen.tsx`, `setFocusedExerciseId`) lets him do exercises in any order, so a
taken machine doesn't stop him. But the next time the same workout opens, it's back in the plan's order
(`exercisesFor`: the built-in `WORKOUT_TEMPLATES` or his custom template's list). If his gym always has the bench taken
at that hour, he jumps every single time.

After this, when he finishes a workout he did in a different order, the summary offers **KEEP THIS ORDER**. One tap
and that workout opens in his order from then on.

**Benchmark (read 2026-11-25):** Hevy: "If you reorder exercises, add or remove exercises or sets during the workout,
you'll see a choice at the end to either 'Update Routine' or 'Keep Original Routine'", where Update Routine "Applies
the changes you made during the workout to the main routine" and Keep Original "Keeps the original routine unchanged;
your edits will only apply to the current workout"
([Hevy Help, Update Routine vs Keep Original Routine](https://help.hevyapp.com/hc/en-us/articles/38387296276375-Update-Routine-vs-Keep-Original-Routine)).
**What we copy:** the choice at the end, and nothing changes unless he picks it. **What we add:** a reset to the plan's
order, and the plan's own priorities still decide the short form. **What we keep out:** saving added or removed
exercises from a workout (that's the template editor's job).

## Recommended defaults (approved when Gavin merges this brief)
1. **When it shows:** on the finish summary (`CompletionSummary`), only when the order he did exercises in, by each
   one's first logged set, differs from the order it opened in. One line: "You went in a different order." with
   **KEEP THIS ORDER** and **KEEP THE PLAN'S**. Nothing is saved unless he taps KEEP THIS ORDER, and it shows UNDO.
2. **The saved order:** the exercises he did, in the order he did them, then the ones he didn't do, in their old order.
3. **Built-in workouts** (A, B, C and the others in `WORKOUT_TEMPLATES`): a new event
   `WORKOUT_ORDER_SET {commandId, templateId, exerciseIds}` (no day, USER). The latest one for a template wins.
   `exercisesFor` applies it. The built-in template itself never changes.
4. **His custom workouts:** KEEP THIS ORDER saves through `updateCustomTemplate` with the exercises reordered, since the
   template is already his.
5. **The short form:** REDUCED still takes the plan's first two exercises (`getReducedExercises` and the custom rule),
   shown in his order. Recovery is unchanged.
6. **Reset:** the workout's card in TRAIN shows "Your order" with **RESET TO THE PLAN'S ORDER** once he has one
   (`WORKOUT_ORDER_SET` with the plan's order, or the custom template's previous order, with UNDO).
7. **A template that changed:** ids no longer in the workout drop out, and new ones go at the end.

## Everything is his to change
The order of every workout, kept or reset, each with undo; the custom template editor as today.

## Design principles check (Vision, Nov 24)
- **One tap for the usual:** the order he uses becomes the default. **Yours to change:** reset any time. **Calm:** one
  line on a screen he already sees. **Asks nothing:** the line shows only after he changed the order himself.

## Scope
- `domain/workout` (an `applyWorkoutOrder` pure helper), `application/trainQueries.ts` (read the latest order per
  template), a `setWorkoutOrder` command, `domain/common/types.ts` (event type), `historyCopy.ts`.
- UI: `TrainScreen.tsx` (`exercisesFor` uses the order; the summary line), the workout card's "Your order" and reset
  (+ css).
- Tests: the line shows only when the order differed; KEEP THIS ORDER saves done-then-not-done order; the next session
  opens in it; REDUCED keeps the plan's two exercises in his order; a custom template saves through
  `updateCustomTemplate`; reset and UNDO; a dropped and an added exercise; progression, rest memory and the lock screen
  read the same exercises as before; native backup round-trip; 320 px and axe on the summary.

## Excluded
Reordering in the middle of a session by drag (the jump rail already does the job). Saving added, swapped or removed
exercises. Changing sets, reps or loads.

## Acceptance
- Phone check: start a workout, do the third exercise first, finish. The summary says "You went in a different order."
  Tap KEEP THIS ORDER. Start the same workout next time: it opens in your order.
- Tap RESET TO THE PLAN'S ORDER on the workout's card: the plan's order is back.

## Decision record
- A choice at the end, like Hevy, so one odd day at the gym doesn't change the plan.
- The plan still picks the short form's two exercises, because those are its priorities, not its order.

## Stop and ask Gavin if
- A training sequence or programme reads exercise order for anything but display (it would then change what's
  prescribed).

## Risks
- **Progression drift:** the test that progression and rest memory read the same exercises is the guard.
