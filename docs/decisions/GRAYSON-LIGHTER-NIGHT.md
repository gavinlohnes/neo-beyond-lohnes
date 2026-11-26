# GRAYSON-LIGHTER-NIGHT — a lighter last night of the run, in one tap (owner go, 2026-11-26)

Gavin's merge of the [brief](../agent/GRAYSON-LIGHTER-NIGHT-001.md) approved these defaults; the build PR records how
each one was built, and two points where the code's real shape decided the detail.

- **When:** the lived day's life moment is `LAST_SHIFT` (read the same way TODAY's band reads it), the run is 2+ nights,
  a day is started (his work-night wake) and the shift hasn't started. Never night one, a day off, or a Minimum Day;
  NOT TONIGHT hides it for the lived day and writes nothing.
- **Placement:** under the Engine's next action, never above it; a new `LIGHTER_NIGHT` attention item counts in the
  budget (`attentionPolicy.ts`), after work-end availability and before COMMITMENT_DUE, because it is a few hours once a
  run and a planned home job (which it may move) stays reachable everywhere else. Tested: the next action's position
  at 360 px is identical with and without the card.
- **Lift part:** tonight's lift is the sequence's next member, a day/rotation programme's slot (none on a rest slot),
  or TRAIN's next workout with no programme. Its SHORT form is the member's linked SHORT, else TRAIN's REDUCED form.
  Hidden when he's trained, a workout is running, or he already said not tonight.
  - **TAKE IT** records `setPlannedWork(day, true)`. `setPlannedWork` stores only planned true/false;
    `WORKOUT_REDUCED` is the TRAIN destination WorkoutCall opens, not a stored answer. So the SHORT choice is kept on
    the phone for the lived day: TRAIN preselects REDUCED, and TODAY's workout rows say SHORT. A linked SHORT keeps
    MY PROGRAMME's own START SHORT.
  - **UNDO** records the earlier answer when there was one. With none, it can't clear the answer: there's no clear
    command, and the brief allows no new event. The SHORT choice goes, the plan to train stays, and the card says so.
    Asked of Gavin in the PR.
- **Food part:** with Fits now on and at least one work-night meal logged in the last 28 days. TAKE IT puts his
  work-night usuals first in Fits now (the MEAL sheet's top and BODY's line) for this lived day only. No target change,
  nothing logged. UNDO puts the usual order back.
- **Home part:** `Home: ` obligations planned for tonight's date move to his first day off with `moveWeekTask`, its own
  guard included. Due dates and repeats stay; due tonight says "due tonight, still due". Three are named, then "and N
  more", and all of them move. UNDO moves each back with the same guard, using the seven-day plan as it stood at TAKE IT
  (still right after midnight). A job changed since is named "changed elsewhere, left as it is".
- **The why:** `getWeekEnergyForecast` for tonight's date. Below `RUN_MEAN_FLOOR` nights it says only "Last night of 3."
  It never says he's tired.
- **Stale plan:** TAKE IT re-reads first. If the lift, the food part or any home job changed (or the shift has started),
  it refuses with "Tonight's plan changed since this card showed. Nothing was changed. Look again."
- **His switches:** MORE · TODAY has the card and each part (the part switches show while the card is on), in `beyond.lighterNight.v1` (travels with backups). What he
  took each night is in `beyond.lighterNight.day.<dayId>` and stays on the phone, like WorkoutCall's LATER.
- **UNDO here vs the Nov 24 rule:** this is a fix of what TAKE IT just changed, so each part's UNDO stays on the folded
  card for the lived day, as the brief says.
