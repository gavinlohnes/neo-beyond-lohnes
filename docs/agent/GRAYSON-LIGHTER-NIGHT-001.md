# GRAYSON-LIGHTER-NIGHT-001 — a lighter last night of the run, in one tap

- **Authorization:** Gavin, 2026-11-26, 05:51 CT, **"Yes"** to putting Launch 1.0 at the top of the build order and
  briefing the flaky-test fix and the lighter-night card. 05:39 CT: **"I like the idea of the smaller launch. I think we
  shift into that mode."** The card was ranked first of the launch ideas in the audit (his pick "Rank now, brief
  later", 2026-11-25). His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging
  this brief approves the defaults below. This is Launch 1.0 piece **X2**.
- **Lane: PROTECTED** (a new TODAY card, and one tap that writes his planned workout and moves planned home jobs). No
  new table, Dexie version, event type, Engine input or notification. Independent exact-head review, green CI; Gavin
  merges.
- **Starting commit:** `origin/master` with GRAYSON-DAY-TARGETS-001 and GRAYSON-FITS-NOW-001 merged. Re-fetch first.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-lighter-night`.
  **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session under Launch 1.0 in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md), after FITS-NOW-001.
  **A TODAY change:** one TODAY PR open at a time across both sessions, so it waits if ONE-OFF-001 (B3) is open.

## Objective and benefit
The last night of a run is usually his hardest, and today GRAYSON treats it like any other work night. The pieces for
an easier one already exist, spread over three places: the SHORT form of tonight's lift (`WorkoutCall.tsx`, recorded
through `setPlannedWork` as `WORKOUT_REDUCED`), his own meals (FITS-NOW-001), and moving a planned home job
(`moveWeekTask`, `application/weekPlannerCommands.ts`). He'd have to make three decisions on his worst night.

After this, on the last night of a run, TODAY shows one card at his work-night wake:

> **Lighter last night?** Last night of 3. On past 3-night runs your energy on this night ran 2.6 of 5 (6 nights).
> - Lift: SHORT B (about 25 min)
> - Food: your work-night usuals first
> - Home: Filter change moves to Mon, your first day off
>
> TAKE IT · NOT TONIGHT

One tap on TAKE IT does all three and folds the card into one line: "Lighter night: SHORT B · your usuals · Filter
change Mon." Each part keeps its own UNDO, so he can keep the short lift and put the rest back.

**Benchmark (read 2026-11-25):** Oura's Rest Mode switches goals off while you keep it on
([Oura](https://ouraring.com/blog/ouras-new-rest-mode-helps-optimize-your-recovery/)); Gentler Streak lets you change
status so the app "shifts its focus from activity to wellbeing"
([App Store](https://apps.apple.com/us/app/gentler-streak-fitness-tracker/id1576857102)). Both wait for you to switch
it. We go past them: GRAYSON knows from his rota which night is the last one, offers it that night only, and changes
three real plans in one tap, each one undoable.

## Recommended defaults (approved when Gavin merges this brief)
1. **When:** the lived day's life moment is `LAST_SHIFT` (`application/lifeTransition.ts`) and the run is 2 nights or
   longer, from his work-night wake until the shift starts. Never on night one, never on a day off.
2. **Lift part:** offered only when tonight has a planned lift and its SHORT form exists (a linked SHORT, or TRAIN's
   `REDUCED` variant). TAKE IT records `setPlannedWork(true, "WORKOUT_REDUCED")`, the same answer WorkoutCall records.
   UNDO records the answer that was there before (or clears it). With no lift planned, the part doesn't show.
3. **Food part:** offered when Fits now is on. TAKE IT puts his most-logged work-night meals (last 28 days) first in
   Fits now and the MEAL sheet for tonight's lived day only. It changes no target and logs nothing. Stored on this
   phone by lived day, like WorkoutCall's LATER.
4. **Home part:** home jobs (`Home: ` obligations) planned for tonight's date move to his first day off with
   `moveWeekTask`. Their due dates and repeats stay as they are, and a job that's due tonight says so in the line
   ("due tonight, still due"). Up to 3 jobs; more than 3 says "and 2 more" and moves them all. UNDO moves each back
   with the same guard (`expected.updatedAt`), and a job changed since says "changed elsewhere, left as it is".
5. **The why:** the energy line reads `getWeekEnergyForecast` for tonight (its run place and length). Below
   `RUN_MEAN_FLOOR` nights it says only "Last night of 3." It never says he's tired and never guesses.
6. **NOT TONIGHT** hides the card for this lived day. Nothing is written.
7. **Placement:** a TODAY attention card under the Engine's recommendation, never above it, and never on a
   Minimum Day (stabilize already shows one action at most). It counts in the attention budget.
8. **Tap bar:** a lighter last night in 1 tap; any part back in 1 tap.

## Everything is his to change
MORE · TODAY: the card on or off (default on, and it still changes nothing until he taps), and each of the three parts
on or off. Settings in `beyond.lighterNight.v1`, which travels with the backup. Which nights count is his rota, as
today.

## Design principles check (Vision, Nov 24)
- **Built around shift:** it reads his rota, not the weekday. **One tap for the usual.** **Always says why:** his own
  record for that night. **Fix, don't ask:** each part undoes on its own. **Calm:** one card, one night, no colour.

## Scope
- Pure `engine/lighterNight.ts`: which parts apply, the lines, the folded line. `application/lighterNightQueries.ts`
  reads the life moment, tonight's plan and SHORT form, the energy forecast, Fits now's state and planned home jobs.
  `application/lighterNightCommands.ts` takes and undoes each part through the existing commands above.
- UI: `ui/screens/today/LighterNightCard.tsx`, its slot in `attentionPolicy.ts`, the switches in MORE · TODAY.
- Tests: shows only on LAST_SHIFT of a 2+ night run (not night one, not a day off, not a Minimum Day); each part hides
  when it has nothing; TAKE IT writes the planned answer and the moves, and nothing else; each UNDO alone; a job
  changed elsewhere; the energy floor; NOT TONIGHT; switches and backup round trip; under UTC and America/Chicago
  (the 16:30 lived day); 320/360/412 px, keyboard and axe.

## Excluded
Turning on by itself. Learning which parts he drops (an idea for 1.1). A lighter week, the rough-night tap and the way
back (later launch ideas that plug into this card). Any change to calorie targets, the Engine or alerts.

## Acceptance
- Phone check: on the last night of a run, after waking, TODAY shows the card with the why. TAKE IT: TRAIN offers the
  SHORT lift, the meal log shows your usuals first, the home job shows on your first day off. UNDO the food part only:
  the other two stay. Switch the card off in MORE: it's gone.

## Decision record
- Last night only, because it's the one the audit found hardest, and night one never needs it.
- Three existing commands, no new event, so every part already undoes and travels with the backup.

## Stop and ask Gavin if
- The card would push the Engine's recommendation or the workout call off the first screen at 360 px.

## Risks
- **Two TODAY changes at once:** ONE-OFF-001 (B3) adds START on TODAY. Whichever lands second rebases.
- **A stale plan:** it reads tonight's planned workout and home jobs when the card renders and again on TAKE IT; a
  change in between refuses with a plain line.
