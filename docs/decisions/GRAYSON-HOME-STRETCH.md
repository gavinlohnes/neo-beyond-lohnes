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
