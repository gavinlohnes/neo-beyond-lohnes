# GRAYSON-WORKOUT-CHANGES-001 — add and swap exercises mid-workout, then keep the changes for next time

- **Authorization:** Gavin, 2026-11-25. 05:03 CT: **"I think we need to get the basics pretty close to perfect before
  we start building all of this ontop of it."** 05:24 CT: **"Brief all of it."** His rule: **"I should be able to edit
  and tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (what a live session prescribes and what's saved to a routine). No new table and no Dexie
  version. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` with ROUTINE-EDIT-001 merged. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-workout-changes-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code, TRAIN basics **#2** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after
  ROUTINE-EDIT-001, whose commands it saves through. **It replaces GRAYSON-TRAIN-ORDER-001** (not started): KEEP THIS
  ORDER becomes part of the one end-of-workout choice below.

## Objective and benefit
In a live workout today (basics audit, Nov 25, flow 2):
- He can't add an exercise.
- A swap is free text under the "Progression and substitution" fold (`TrainScreen.tsx`), with recent names and FIND BY
  MUSCLE. The swapped name is recorded as `substitutedName` on the original exercise.
- He can jump to any exercise, but the order isn't saved (TRAIN-ORDER-001 was briefed for that).

After this, **ADD EXERCISE** and **SWAP** sit on the live workout. A swap offers three moves for the same muscle on
equipment he has used, each with his last numbers. When the workout ends with any change (added, swapped, removed or
reordered), the summary asks once: **Keep these changes for next time?**

**Benchmark (read 2026-11-25):** Hevy: the blue "+ Add Exercise" button works "whether building a routine or logging a
live workout", and the three dots give "reorder, replace, or remove"
([Hevy, track workouts](https://www.hevyapp.com/features/track-workouts/)). At the end, Hevy offers "Update Routine" or
"Keep Original Routine"
([Hevy Help](https://help.hevyapp.com/hc/en-us/articles/38387296276375-Update-Routine-vs-Keep-Original-Routine)).
**What we copy:** add, replace and the choice at the end. **What we add:** swap suggestions from his own muscle groups,
equipment and numbers. **What we keep out:** anything saved without his tap.

## Recommended defaults (approved when Gavin merges this brief)
1. **ADD EXERCISE** (below the current exercise list): a search of the whole library, his own exercises first, and the
   three most recent he's done. The new exercise starts with 3 sets and its library rep range, and its last numbers when
   he has them. It's logged as itself, with its own history.
2. **SWAP** (on the current exercise, out of the fold): three suggestions for the same muscle group
   (`exerciseLibrary.ts` `muscleGroup`), ranked by equipment he has logged sets with in the last 60 days, then by how
   recently he did them. Each shows "Last: 135 lb × 10". **SEARCH** finds any other exercise. FIND BY MUSCLE stays.
3. **What a swap records:** a swap to a library exercise logs that exercise's id, so its own history and progression
   carry on. Free text stays possible and is recorded as today (`substitutedName`).
4. **Remove** an exercise from this workout: its unlogged sets leave the plan for today; logged sets stay.
5. **At the end:** when anything was added, swapped, removed or reordered, the finish summary shows one line, "You
   changed this workout.", with **KEEP FOR NEXT TIME** and **JUST TODAY**. KEEP saves through ROUTINE-EDIT-001's
   command, with UNDO, and the programme stays in step. JUST TODAY changes nothing. No answer means JUST TODAY.
6. **Order:** a different order alone also shows the line (TRAIN-ORDER-001's KEEP THIS ORDER, folded in). The saved
   order is the exercises done, in the order done, then the ones not done.
7. **Short form:** REDUCED still takes the routine's first two exercises, after any saved change.
8. **Tap bar:** swap in 2 taps (SWAP, a suggestion). Add one of his own in 3. Keep the changes in 1.

## Everything is his to change
Each add, swap and removal in the workout; KEEP or JUST TODAY; UNDO after KEEP; the routine through ROUTINE-EDIT-001.

## Design principles check (Vision, Nov 24)
- **One tap for the usual:** the swap he wants is likely in the first three. **Asks nothing** unless he changed
  something, and then once. **Always says why:** each suggestion shows the muscle and his last numbers.

## Scope
- `application/` (`addExerciseToSession`, `swapExerciseInSession`, `removeExerciseFromSession`, swap suggestions as a
  pure ranker), `application/trainCommands.ts`, the finish summary in `TrainScreen.tsx`, `historyCopy.ts`.
- UI: ADD EXERCISE and SWAP on the live workout (+ css). Retire TRAIN-ORDER-001's brief with a pointer here.
- Tests: an added exercise logs under its own id and shows in History; a swap to a library exercise carries its history,
  free text works as before; suggestions are same muscle, ranked by recent equipment, with last numbers; remove keeps
  logged sets; the end line shows only after a change; KEEP saves through the routine command with UNDO and keeps the
  programme in step; JUST TODAY changes nothing; REDUCED after KEEP; lock-screen sets and Gym mode still work; 320 px
  and axe on the live workout and the summary.

## Excluded
New set types or timed sets. Changing the programme's sequence. Editing a finished workout (History already fixes sets).

## Acceptance
- Phone check: in A, tap SWAP on the chest press. Three chest moves show your last numbers. Pick one, log it, then add
  a cable fly. Finish: "You changed this workout." KEEP FOR NEXT TIME. Next A has both changes. UNDO puts A back.

## Decision record
- One question at the end, because asking at every change slows the workout.
- A swap to a library exercise logs that exercise, so its history is true.
- TRAIN-ORDER-001 is folded in, so there's one end-of-workout choice, not two.

## Stop and ask Gavin if
- A change he keeps would remove an exercise that a standards test or the emphasis block counts on.

## Risks
- **Wrong history:** swapped sets are logged under the exercise he did, with tests.
