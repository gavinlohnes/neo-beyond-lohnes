# GYM-FOUNDATION-001 — the live workout and gym mode on the visual foundation

- **Authorization:** Gavin, 2026-11-19. He asked for a night plan "that will be noticeably transformative and
  impressive at 0600" and chose "1A" (finish the one look: the live workout first, then the everyday sheets). This is
  HARVEST-001 backlog #8 ("Live workout on the foundation: bigger numerals and framed exercise panels, same flow").
  Building and opening the PR are authorized. Gavin merges.
- **Builder:** Claude Code. **Starting commit:** master `1f6e3d8`. **Branch:** `claude/gym-foundation-001`.
- **Lane:** Feature, presentation only, with independent exact-head review because TRAIN is where Gavin logs under
  fatigue. Changing the Engine, schema, events, commands, backups, providers, dependencies or navigation would be
  Protected: stop and report instead.

## Scope

- **Command bar:** the live workout opens with a foundation command bar.
  - It shows `/// TRAIN // LIVE` and the workout ("WORKOUT B — in progress", unchanged).
  - GYM MODE is the bar's one action. It's the same button and the same focus return.
- **Two numbers:** EXERCISES DONE and SETS LOGGED become framed foundation panels, each with the red bracket and a
  large numeral.
  - EXERCISES DONE reads "0 / 4".
  - SETS LOGGED reads "1 of 11" (working sets out of the prescribed sets).
  - The line under them keeps "N skipped".
- **The current exercise** keeps its one dominant frame (`.command-surface`, the same element that tests and TODAY's
  grammar rely on). Inside a live workout it gains the foundation's language:
  - cut corners on two opposite sides;
  - the red bracket;
  - a red-tinted frame and wash;
  - the exercise name in the display face, in capitals;
  - "/// EXERCISE 1 OF 4" as a mono label;
  - LAST TIME and BEST in the mono reference face.
  - The words are unchanged.
- **Weight and reps** are 32 px condensed numerals.
- **The rest timer's remaining time** is a 46 px numeral.
- **Gym mode** uses the same language, larger:
  - a mono `/// EXERCISE 1 OF 4` eyebrow;
  - a 40 px name;
  - a mono SET line;
  - 72 px numerals;
  - the ghost set as a small framed panel;
  - a 32 px rest line.
  - LOG SET, SKIP, EXIT, the cue and the plate math are unchanged.
- **Text size:** TRAIN keeps its own stricter rule (TRAIN-OPERATOR-001): every text in a live workout is 16 px or
  larger, labels included.

**Excluded:**
- any change to logging, rest, skipping, undo, finishing, set details or progression;
- TRAIN's first view (VISUAL-FOUNDATION-002);
- history and records;
- MY PROGRAMME;
- the exercise rail and FINISH;
- the app header.

**Leverage gate:**
- **REUSE:**
  - the foundation's tokens and classes (`.bf`, `.bf-bar`, `.bf-value`, the panel bracket and cut;
    VISUAL-FOUNDATION-001);
  - TRAIN's existing markup, handlers and `.command-surface` frame.
- **OWN:** `src/ui/screens/train/trainLive.css`, which maps TRAIN's live elements to the foundation.
- **BUILD FROM SCRATCH:** none.

## Verification

- `tests/browser/GymFoundation001.test.tsx` covers:
  - the bar and its one action;
  - framed numerals with the red bracket;
  - one dominant surface with the bracket;
  - display-face numerals;
  - LOG still the one red action;
  - the same logging flow (LOG moves SETS LOGGED and writes the set);
  - gym mode's 64 px+ numerals;
  - no spill and no text under 16 px from 320 to 1024 px;
  - axe on the live workout and gym mode.
- The existing TRAIN and gym suites pass unchanged: `TrainScreen`, `TrainOperator`, `GymMode`, `GymUpgrade`,
  `Cleanup002`, `SpeedUnderFatigue`, `RedesignTrain`, `accessibility`, `SuitLayer01VisualGrammar`,
  `WorkoutAtomicity`, `VisualFoundation002` and `TrainHome`.
- Full local gate: `TZ=UTC npm run verify`. PR CI runs on the exact head.
- Screenshots: `VITE_WALKTHROUGH_SHOTS=<dir>` writes `gym-foundation-live.png`, `-live-logged.png` and `-gym.png`.

## Next

- SHEETS-FOUNDATION-001: LOG, check-in, REVIEW and Alfred on the foundation (the second half of "1A").
- On the phone: start a workout, log two sets, open GYM MODE and log one more there.

## Found while verifying

- **`BodyDash001` "never invents" test fixed:** it failed 3 of 9 runs on this branch. Master passed 9 of 9.
  - **Cause:** the test ran axe straight after the DATA tab opened. axe read the tab's entrance fade as low contrast.
    This branch's extra stylesheet shifts the timing enough to expose the race.
  - **Fix:** `aa()` now finishes running animations first (the file's own `settle()`). It then passed 6 of 6, all five
    tests each time.
  - The test still checks exactly the same thing.
- **`PostShift` "after shift" failed once** in the full local run, then passed 6 of 6 on its own. Treated as load
  timing in the local run; PR CI is the check.
