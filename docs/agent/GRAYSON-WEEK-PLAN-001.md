# GRAYSON-WEEK-PLAN-001 — the training week laid on his Week A and Week B, a day at a time

- **Authorization:** Gavin, 2026-11-25. 05:03 CT: **"I think we need to get the basics pretty close to perfect before
  we start building all of this ontop of it."** 05:24 CT: **"Brief all of it."** His rule: **"I should be able to edit
  and tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (the training programme). No new table and no Dexie version (a new programme mode is an optional
  shape inside the existing revision). Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` with ONE-OFF-001 merged. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-week-plan-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code, TRAIN basics **#4** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25).

## Objective and benefit
The programme today (`domain/workout/trainingProgramme.ts`, `TrainingProgrammePanel.tsx`) has three modes:
- **WEEKDAYS:** one routine per weekday, the same every week.
- **ROTATION:** by WORK1 to WORK3 and OFF1 to OFF3, the Nth workday or day off in a row
  (`engine/trainingProgrammeResolution.ts`). A fourth day in a row gets nothing.
- **SEQUENCE:** exactly three members, A, B and C, in turn.

None of them shows his two weeks as days. Each is set with a list of dropdowns, and one day can't be changed without
editing the pattern for every week. A plan of more or fewer than three routines only works through WEEKDAYS or
ROTATION, which don't follow his Week A and Week B (the saved work schedule, `ScheduleWeekDefinition`, MORE · Work
Schedule).

After this, TRAIN shows **THIS WEEK** and **NEXT WEEK** as seven days each, laid on his saved Week A and Week B, with
work days marked. Each day shows its routine or "Rest". He taps a day to change it. He can change **just this day**, or
**every Week A** (or B) day like it.

**Benchmark (read 2026-11-25):** Hevy keeps routines in a list and leaves the schedule to the user
([Hevy, track workouts](https://www.hevyapp.com/features/track-workouts/)). We go past it here: the week is built on his
shift, which Hevy can't see.

## Recommended defaults (approved when Gavin merges this brief)
1. **A new mode, WEEK_PLAN:** `{ mode: "WEEK_PLAN"; weeks: Array<Record<"0".."6", string | "REST">> }`, one entry per
   week of his saved schedule (`weeks.length` follows the schedule, two today). Any number of routines, any day.
2. **Starting it:** the first time he opens the week, it's filled from what he has now. A SEQUENCE lays A, B and C in
   turn on his days off first, then work days, keeping the next member next. WEEKDAYS and ROTATION are converted day by
   day. He sees it before it's saved: **USE THIS WEEK** or **KEEP MY CURRENT SETUP**. The old modes stay valid and can
   be restored (the restore panel exists).
3. **Changing a day:** tap the day, pick a routine, Rest, or **Empty workout**, then **JUST THIS DAY** or **EVERY WEEK
   A** (B). A one-day change is a dated override that ends after that day. Both have UNDO.
4. **Moving a day:** "Move to…" puts a day's workout on another day this week and leaves Rest behind (one tap each),
   for a swapped shift.
5. **What TRAIN and TODAY show:** the planned workout comes from the plan (the override first, then the week). A missed
   day stays missed; the plan doesn't shift itself. Delta's read-only shift notes stay as they are.
6. **Without a saved schedule:** the week falls back to plain Monday-to-Sunday, and says "Save your work schedule to see
   Week A and Week B."
7. **Tap bar:** change one day in 3 taps (the day, the routine, JUST THIS DAY). Move a day in 3.

## Everything is his to change
Every day of every week, a single day's override, the move, and going back to his old setup.

## Design principles check (Vision, Nov 24)
- **Built around shift:** the week is his Week A and Week B. **Yours to change:** any day, one day or every week.
  **Always says why:** a converted plan shows where each day came from before he saves it.

## Scope
- `domain/workout/trainingProgramme.ts` (WEEK_PLAN, the day override), `engine/trainingProgrammeResolution.ts` (resolve
  from the week index of his schedule, `anchorMondayForCurrentWeek`), `application/trainingProgramme.ts` and
  `trainingProgrammeQueries.ts` (save, convert, override, undo), `persistence/trainingProgrammeValidation.ts` (the new
  shape; older backups still import).
- UI: a `WeekPlan` view in TRAIN (+ css), reached from the workout card's "This week". `TrainingProgrammePanel.tsx`
  keeps the advanced modes behind it.
- Tests: conversion of each mode gives the same day-by-day plan; the sequence keeps its next member; Week A and Week B
  resolve from the saved anchor; a one-day override ends the next day; EVERY WEEK A changes only A days; move leaves
  Rest; a missing schedule falls back to Monday to Sunday; restore of the old mode; native backup round-trip and an
  older backup imports; 320 px and axe on the week, keyboard day selection.

## Excluded
Blocks and a lighter week (BLOCK-CYCLE-001). The plan moving itself after a missed day. Running weeks (Couch to 5K keeps
its own plan).

## Acceptance
- Phone check: open TRAIN · This week. Your two weeks show your work days, with your routines laid out. Tap Thursday,
  pick B, JUST THIS DAY: TODAY shows B on Thursday, and next Thursday is back to normal. Tap a day off, pick your
  saved arms routine, EVERY WEEK B: it's on every Week B.

## Decision record
- The week follows his saved schedule, not the calendar, because his week is built on shift.
- A missed day stays missed, because a plan that moves itself is a plan he has to check.

## Stop and ask Gavin if
- Converting his current setup would change what TRAIN plans for today.
  **Asked and answered (Gavin, 2026-11-26): "Keep today as now."** USE THIS WEEK saves a one-day override for today
  with what TRAIN plans right now; the week takes over from tomorrow.

## Risks
- **A wrong week:** the week index comes from the same anchor the schedule already uses, with tests across a rota
  change.
