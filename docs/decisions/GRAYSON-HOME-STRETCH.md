# GRAYSON-HOME-STRETCH — home workouts in one tap, stretch routines, a home twin (owner go, 2026-11-26)

Gavin's merge of the [brief](../agent/GRAYSON-HOME-STRETCH-001.md) approved these defaults. Each slice's PR records
how it was built. Slices B and C add their sections here.

## Slice A: home in one tap, and the home moves made real
- **Library:** ten of the twelve HOME A/B/C moves join `EXERCISE_LIBRARY` as `Bodyweight` entries under their own
  `home-*` ids, so every logged home set keeps its history. Glute Bridge and Plank already existed as library moves, so
  `home-glute-bridge` and `home-plank` map to them in `TEMPLATE_TO_LIBRARY_ID` instead of getting a second entry.
- **Muscle groups:**
  - Chest: Incline Push-Up.
  - Arms: Close-Grip and Diamond Push-Up (triceps-led).
  - Shoulders: Pike Push-Up.
  - Back: Prone Pull-Down and Reverse Snow Angel.
  - Legs: Bodyweight Squat and Split Squat.
  - Core: Dead Bug and Side Plank.
  - Glutes and Core: Glute Bridge and Plank, by their library entries.
  - The weekly muscle count now resolves mapped ids too.
- **How-to:** ten new guides, written fresh in plain words: role, setup, three cues, two mistakes and "Easier: … Harder:
  …". The two mapped moves use their library guides. His own edits keep working as before.
- **HOME on TRAIN** sits beside the gym start, in its own file (`HomeStartChoice.tsx`). `TrainScreen.tsx` only mounts it
  and starts through its own `handleStart`, so the RED gate and in-flight guard apply.
  - **With a sequence and a linked HOME form:** `START AT HOME · B`, one tap.
  - **With a sequence and no links:** `SET UP HOME` makes HOME A, B and C. It keeps any he already has by name,
    edits included, and makes no duplicates. It then shows one review, "A → HOME A, B → HOME B, C → HOME C. Use these?",
    with USE THESE, CHANGE (a pick per member) and CANCEL. USE THESE links through `saveTrainingProgramme` with its
    version guard and keeps his place in the sequence.
  - **Without a sequence:** SET UP HOME makes the routines, then HOME A, B and C are offered directly.
  - While a sequence needs review, nothing shows.
- **The advance rule is unchanged:** HOME advances the sequence only after a completed linked HOME workout with
  recorded work. This is already tested in `tests/ui/trainingProgramme.test.ts`.
- **Timed holds:** GRAYSON-SET-TYPES-001 (T6) hasn't merged, so Plank and Side Plank keep their 1–3 "rep" range here.
  T6 should mark them timed, with a 30 s target, per this brief.

## Slice B: stretch routines that fit the hour
- **Stretches:** fourteen hand-written stretches (`stretchLibrary.ts`, ids `stretch-*`). Each has a name, the area it
  works, whether it's one-sided, a default hold and plain-word cues, written fresh. Every routine says "Stop if
  anything hurts."
- **Starters:** After shift, Before sleep and After lifting.
  - The brief's "30 s holds" and "about 8 to 10 minutes" don't both fit six stretches with one hold each, which comes
    to about 4 minutes. So each starter keeps 30 s holds, both sides on one-sided stretches, and does every stretch
    twice. That makes them 9, 8 and 10 minutes.
  - A step's rounds are his to change, from 1 to 5, along with the hold, the sides and the order.
- **Storage:** the whole list rides on one global `STRETCH_ROUTINES_SET` event, like `TRAIN_PROGRAM_SET`, so it's in
  backups and the export. The newest valid event wins; with none, the starters.
  - SAVE, DELETE and RESET each write the whole list, with a version guard.
  - RESET brings a starter back as it shipped. A deleted starter keeps a RESET line in the list.
- **Player:**
  - One stretch at a time: the side, the hold counting down and the next stretch.
  - A buzz (`feedback.ts`) and the cue on screen at each change: "Switch sides", "Again", "Next: …", "Last one: …",
    "Done".
  - PAUSE, SKIP, +15 S and END are one tap each.
  - Timing comes from the clock (start, paused time, skipped seconds, added seconds; `stretchCues.ts`), never a running
    timer.
  - The live play is kept on this phone (`beyond.stretchPlay.v1`) and cleared when it's saved.
- **Spoken cues:** Health Bridge gets the run-cue envelope with the routine's cues, under the same VOICE CUES switch
  and voice setting. Health Bridge only accepts the run's six cue kinds, so every change is sent as its plain spoken
  kind (`HALFWAY`) and the end as `FINISH`. That needs no Bridge change; buzzing stays on the screen.
- **Logged as recovery:**
  - START opens a RECOVERY session through `startWorkout`. Finishing saves through `completeRecoverySession` with the
    minutes and the routine's id, name and whether it was played to the end. This goes on the session row and on
    `WORKOUT_COMPLETED`, both optional fields.
  - Played to the end, it's COMPLETED whatever its length. That comes from the optional `routineCompleted` flag in
    `deriveRecoverySessionStatus`. Stopped early, the 1-to-9-minute rule applies.
  - Every other recovery session, and every one already logged, reads as before. Stored statuses are never
    re-derived, and Minimum Day reads minutes, not status.
  - It never moves the rotation.
- **Fits the hour:** TRAIN suggests one routine, with why ("Your shift ended at 6:00.").
  - After shift: within 2 h after his shift ends. That's MARK WORK ENDED, else the schedule's end, but not on a day
    confirmed off.
  - Before sleep: within 2 h before his usual sleep start, from his Garmin rhythm for that kind of day. This works on
    days off too.
  - After lifting: within 1 h after a finished strength workout.
  - If more than one applies, the nearest time wins. Otherwise there's no suggestion, just the list.
  - The suggestion is on screen only; nothing starts by itself or is sent to his phone. The windows and an off switch
    are in MORE · Train (`beyond.stretchSuggest.v1`, travels with backups).
- **Taps:** the suggested routine starts in 1 tap; any other in 2 (STRETCH ROUTINES, then START).
