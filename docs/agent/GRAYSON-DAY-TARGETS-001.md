# GRAYSON-DAY-TARGETS-001 — a calorie target for each kind of day, with the week's total held

- **Authorization:** Gavin, 2026-11-25. 06:50 CT: **"I think the first 2 area we get to being above amazing is
  nutrition and Train."** 08:46 CT, asked whether to brief calorie targets by kind of day: **"Yes. That's a good
  idea."** 07:48 CT on flip days: **"I mostly stay on night shift mode... a flip day would be something that I plan
  for. Like I set it in the calender and it's an anomaly."** His rule: **"I should be able to edit and tweak or correct
  everything in this app."** Merging this brief approves the defaults below. This brief alone lifts his Nov 25
  briefing pause ("Stop after 717"); it lifts nothing else.
- **Lane: PROTECTED** (it changes the calorie target that FUEL, the meal plan and the weekly debrief read, and the shape
  of the stored nutrition targets row). No new table, Dexie version, event type, Engine input or notification.
  Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `7be7ec79` or later. Re-fetch before starting. If GRAYSON-WINDOW-REVIEW-001
  (branch `ccr-380c4225-window-review`) is still open, finish and land it first: both read the same day kinds.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-day-targets`.
  **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session, FUEL first, in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25).

## Objective and benefit
Today he has one calorie target for every day (`NutritionTargets.calorieTargetKcal`, set in MORE · Nutrition targets,
or saved from the weekly proposal in `application/targetProposal.ts`). A work night, the first day off after a run and
a lift day all get the same number, and the "remaining" line on the food card (`describeCalorieProgress`,
`ui/screens/body/nutritionCopy.ts`) reads against it.

After this, he can switch on **targets by kind of day**. Each day's target is his weekly target plus or minus his own
adjustment for what the day is, and the food card says which: "Work night · 1,850 / 2,050 kcal · 200 remaining". The
two-week average stays at the target he set or saved, so the week's total doesn't drift. Protein stays the same every
day.

**Benchmark (read 2026-11-25):** MacroFactor offers "Set different macros for different days", by day of the week
([MacroFactor](https://macrofactor.com/macrofactor/)). His rota runs on Week A and Week B, not weekdays, so we go past
it: the day's kind comes from his saved schedule and his training plan, which MacroFactor can't see.

## Recommended defaults (approved when Gavin merges this brief)
1. **Off until he turns it on.** With it off, nothing changes anywhere. Turning it on in MORE · Nutrition targets shows
   the four adjustments at 0, so the first day looks the same as today. No number is guessed for him.
2. **Kinds of day,** reusing the eating window's kinds so the two agree (`dayKindFor`, `application/eatingWindow.ts`):
   - **Work night** (`WORK`, life state `WORK_RUN`).
   - **First day off** (`RECOVERY`), the day after a run.
   - **Day off** (`OFF`, life state `FREE`, and `FLIP`). He stays on night hours; a flip is rare and planned, so it
     gets no kind of its own.
   - **Lift day,** an adjustment on top of the day's kind: a strength workout planned for that day by his training
     programme (`resolveProgrammeSlot`, `engine/trainingProgrammeResolution.ts`; WEEK-PLAN-001's plan once built), or
     one logged that day. A run alone is not a lift day.
   - A day the schedule can't place uses his plain target.
3. **His adjustments:** a signed number of kcal for each of the four, in steps of 50 (a stepper, 44 px), shown as
   "Work night +150". Each one is his to change at any time, with UNDO.
4. **The week's total held.** Under the adjustments, one line shows what they average over his saved two weeks (from
   his Week A and Week B and the planned lifts): "Over two weeks: 1,950 a day, your target" or "Over two weeks: 60 over
   your target". When it's off, one tap on **BALANCE** changes the day-off adjustment so the average matches, and shows
   UNDO. Nothing balances itself.
5. **His floor holds.** No day's target goes below his calorie floor (`calorieFloorKcal`, 1,500 unless he set his
   own). A day the floor lifts says so: "Day off · held at your floor". Every number is his: if a doctor or dietitian
   has given him one, he enters that, and the app never argues with it.
6. **Where the day's target shows:** the food card's remaining line and meter (BODY), the BODY dashboard meter, the meal
   plan's day totals (`application/mealPlanQueries.ts`), and Delta's TARGETS line (`application/operatorContext.ts`),
   which names the kind: "today's target 2,050 kcal (work night, lift day)".
7. **The weekly proposal is unchanged.** It still proposes the plain daily target. Saving it moves every day by the same
   amount, and the adjustments ride on top. The weekly debrief (`application/weeklyDebriefQueries.ts`) compares the
   week with that week's own day targets.
8. **Always says why:** a tap on the day's target shows its parts: "Weekly target 1,950 · work night +100 · lift day
   +150".
9. **Tap bar:** see today's target with its reason in 0 taps. Change one adjustment in 3 (open, step, done).

## Everything is his to change
Switching it on or off, each of the four adjustments, BALANCE and its UNDO, and his weekly target and floor as today.

## Design principles check (Vision, Nov 24)
- **Built around shift:** the day's kind comes from his rota, not the calendar. **Yours to change:** every number.
  **Always says why:** the target names its kind and parts. **Calm:** no new alert, colour or nag; over target stays
  the plain "over by" line that exists now.

## Scope
- `domain/common/types.ts` (`NutritionTargets.dayTargets?: { on: boolean; adjustKcal: { WORK: number; RECOVERY: number;
  OFF: number; LIFT: number } }`), `persistence/nutritionTargetValidation.ts` (the optional shape; a row without it
  still reads, so older backups import), `application/nutritionTargetCommands.ts` (save, balance, undo).
- A pure `engine/dayTarget.ts`: day target from the plain target, the day's kind, lift day and the floor; the two-week
  average from a list of projected days. No I/O.
- `application/nutritionTargetQueries.ts`: `getDayCalorieTarget(beyondDayId)` returning `{ kcal, kind, lift, parts,
  floorHeld }` or the plain target when off; every reader listed in default 6 asks this instead of reading
  `calorieTargetKcal` directly.
- UI: the adjustments block in `ui/screens/more/NutritionTargetsSettings.tsx` (+ css); the kind label in
  `nutritionCopy.ts`'s calorie line.
- Tests: off gives exactly today's numbers everywhere; each kind maps from its life state; FLIP maps to day off; lift
  adds on top of the kind; a run alone isn't a lift day; the floor holds and says so; BALANCE makes the two-week
  average equal the target and UNDO restores; saving the weekly proposal moves the base only; an old row without
  `dayTargets` reads and round-trips through a native backup; 320 px and axe on the settings block.

## Excluded
Protein by kind of day (protein stays one daily number). Carb and fat targets. "What fits now" (its own brief, after
this). Changing the weekly proposal's arithmetic. Any automatic change to a target.

## Acceptance
- Phone check: MORE · Nutrition targets · switch on targets by kind of day. Set work night +100 and lift day +150. The
  two-week line shows you're over; tap BALANCE and it matches. On a work night with a lift planned, the food card reads
  "Work night, lift day" with your new number, and a tap shows how it was made. Switch it off: everything is back to
  one number.

## Decision record
- Kinds come from his rota and training plan, not weekdays, because Week A and Week B don't follow the calendar.
- The week's total is held by a line and one tap, not by the app moving numbers, because nothing changes without his
  tap.
- Flip days count as days off, because he stays on night hours and plans a flip as an exception.

## Stop and ask Gavin if
- The eating window's day kinds and this brief's would disagree about the same day.
- Any reader in default 6 can't take the day's target without changing what it shows when the feature is off.

## Risks
- **Two targets in two places:** every reader goes through `getDayCalorieTarget`, with a test that none reads
  `calorieTargetKcal` directly for display.
- **A wrong kind on a rota change:** the kind comes from the same life state the eating window uses, with tests across
  a schedule change.
