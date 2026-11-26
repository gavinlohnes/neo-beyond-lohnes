# GRAYSON-HOME-STRETCH-001 — home workouts in one tap, a home twin for every routine, and stretch routines that fit the hour

- **Authorization:** Gavin, 2026-11-26, 14:21 CT: **"I would like to see some basic home work outs that I can do. Like
  body weight exercises and stretching."** 14:43 CT he asked for the idea to be grown ("yes, and" twice). 14:48 CT,
  **"Yes"** to "Should I brief direction 1 into 1.0, so it's ready for Dec 7?", where direction 1 was: one tap HOME A,
  B, C and timed stretch routines; *yes, and* stretches fit the hour (a 6 AM decompress after shift, a wind-down
  before sleep); *yes, and* every gym routine gets a home twin. His standing rule: **"I should be able to edit and
  tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (it saves the training programme's HOME links and changes how a recovery session's status is
  worked out). No new table and no new Dexie version: new data rides on events, the same way `TRAIN_PROGRAM_SET`
  carries the programme. Independent exact-head review on each PR, green CI; Gavin merges.
- **Starting commit:** latest `origin/master` (at writing, `f16ec4cc`, with T1 routine editor #730 and T2 workout
  changes #735 merged). Re-fetch before each slice.
- **Builder:** Claude Code, Delta-track session (the "Project Grayson codex notes" chat), after X2 LIGHTER-NIGHT.
  Branches `claude/grayson-home-stretch-a`, `-b`, `-c`. **Reviewer:** a fresh-context reviewer.
- **Order:** row X4 in the Launch 1.0 table of [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md). Three PRs, A then B
  then C. The TRAIN builder is working through T3 to T7 in `TrainScreen.tsx` at the same time, so keep new UI in new
  component files, touch `TrainScreen.tsx` only to mount them, and rebase on master right before opening each PR.

## Objective and benefit
The app already holds bodyweight HOME A, B and C (`src/domain/workout/homeTemplates.ts`) and can link one to each gym
routine as its HOME form (`TrainingProgrammePanel.tsx`, `trainingProgramme.ts`). But getting there takes him through
MY PROGRAMME, SET UP HOME FORMS, CREATE BODYWEIGHT HOME OPTIONS, a link per routine and CONFIRM, and only in
sequence mode. The home moves have no how-to and aren't in the exercise library, so swaps and muscle counts can't see
them. There is no stretching at all: the only mobility item is a hamstring drill in `graysonPlanDraft.ts`.

After this:
- **Home in one tap.** On TRAIN's start area, a **HOME** choice sits next to the gym start: "Gym closed or short on
  time? Do B at home." One tap starts the home version of whichever routine is next.
- **A home twin for every routine.** Each gym routine gets a bodyweight twin that hits the same muscles, lift by lift.
  When he edits a gym routine, the app offers to update its twin. He reviews and changes every pick.
- **Stretch routines that fit the hour.** A guided player: each stretch has a hold timer, a buzz and a spoken cue when
  it's time to switch sides or move on, and it logs as a recovery session. Three starter routines: **After shift**
  (the 6 AM decompress), **Before sleep** (the wind-down) and **After lifting**. TRAIN suggests the one that fits now,
  from the shift and sleep times the app already knows. He can edit all three and make his own.

Benchmark: Bend, a stretching app, offers routines named by when and why you use them ("Wake Up", "Sleep", "Posture
Reset"), "a timer to guide you through each routine", and lets you "create your own custom stretching routine"
([Bend on the App Store](https://apps.apple.com/us/app/bend-stretching-flexibility/id1513988468)). User reviews on
that listing say it beeps at each change and signals "when it's time to move to the other side". We go past Bend in
two ways: the routine is picked from his actual shift and sleep, not a menu, and the cues reuse the spoken run cues
he already has on his phone through Health Bridge.

## Recommended defaults (approved when Gavin merges this brief)

### Slice A: home in one tap, and the home moves made real
1. **Home moves join the library.** Add the twelve `home-*` moves from `homeTemplates.ts` to `exerciseLibrary.ts` as
   `equipment: "Bodyweight"`, each with its muscle group (for example Incline Push-Up → Chest, Prone Pull-Down → Back,
   Pike Push-Up → Shoulders, Split Squat → Legs, Glute Bridge → Glutes, Dead Bug and planks → Core). Keep the `home-*`
   ids so every logged home set keeps its history. Where a home move duplicates a library move (Glute Bridge, Plank),
   map it in `TEMPLATE_TO_LIBRARY_ID` instead of adding a second entry.
2. **How-to for every home move**, in `exerciseHowTo.ts`: role, setup, three cues, two common mistakes and an easier
   and a harder version, written fresh in plain words. His edits keep working as they do today.
3. **The HOME choice on TRAIN.** When the programme has a HOME form linked for the next routine, the start area shows
   `START AT HOME · B` beside the gym start, one tap, using the same `onStart(..., { form: "HOME" })` path and the same
   rule that HOME advances the rotation only after a completed linked HOME workout with recorded work.
4. **First use sets itself up, with his tap.** If no HOME forms are linked yet, the HOME choice reads `SET UP HOME`.
   One tap creates HOME A, B and C if they don't exist (`ensureExactCustomTemplateSet`) and shows one review card:
   "A → HOME A, B → HOME B, C → HOME C. Use these?" with **USE THESE** and **CHANGE**. Nothing saves until he taps.
   USE THESE saves the links through `saveTrainingProgramme`.
5. **Not only in sequence mode.** If he isn't running a sequence, the HOME choice offers the three HOME routines
   directly, the same way the gym routines are offered.
6. **Timed holds.** If GRAYSON-SET-TYPES-001 (T6) has merged when this slice is built, mark Plank and Side Plank as
   timed, 30 s target. If not, add a line to T6's PR notes so the TRAIN builder does it there.
7. **Taps:** start a home workout in 1 tap once set up; first-time setup in 2 taps.

### Slice B: stretch routines
1. **Stretches.** A small hand-written set in a new `src/domain/workout/stretchLibrary.ts`, each with an id
   (`stretch-*`), a name, the area it works, whether it's one-sided, a default hold and two or three plain-word cues.
   Starter set of about fourteen: neck side stretch, upper-back reach, doorway chest stretch, standing quad stretch,
   kneeling hip-flexor stretch, standing calf stretch, seated hamstring fold, figure-4 glute stretch (lying),
   cross-body shoulder stretch, overhead lat stretch, lying spinal twist, child's pose, legs up the wall, and slow
   breathing (time only). Written fresh, not copied from any app or site.
2. **Starter routines**, each about 8 to 10 minutes, 30 s holds, both sides on one-sided stretches:
   - **After shift:** neck, upper back, doorway chest, hip flexor, calf, child's pose. Undoes a night of standing and
     sitting.
   - **Before sleep:** seated hamstring fold, figure-4, lying twist, child's pose, legs up the wall, a minute of slow
     breathing. Slow and on the floor, nothing that wakes him up.
   - **After lifting:** quad, hamstring, doorway chest, lat, figure-4, calf.
3. **Player.** One stretch at a time, big name, the hold counting down, the next stretch named underneath. A buzz at
   each change (`feedback.ts`), and a spoken cue through Health Bridge using the same pattern as
   `runningCues.ts`/`runCueBridge.ts`: "Switch sides", "Next: child's pose", "Last one", "Done". Timing comes from
   elapsed seconds, as the run cues do, so a locked screen doesn't drift. PAUSE, SKIP, +15 s and END are each one tap.
   The voice follows his existing run-cue setting (`runCuePrefs.ts`).
4. **Logged as recovery.** Finishing saves through `completeRecoverySession` with the minutes played and the routine's
   name. It never advances the rotation or a progression, as recovery sessions don't today. **One change:** a routine
   played to the end counts as completed whatever its length, so an 8-minute wind-down isn't called partial. Stopped
   early still uses today's minutes rule (1 to 9 minutes partial). Add an optional `routineCompleted` flag; old
   recovery sessions read exactly as before.
5. **Fits the hour.** TRAIN's recovery area suggests one routine from what `getShiftSleepPlan` already knows:
   - within 2 hours after a shift ends: **After shift**;
   - within 2 hours before his usual sleep start: **Before sleep** (if both apply, the one whose time is nearer);
   - within 1 hour after a finished workout: **After lifting**;
   - otherwise no suggestion, just the list.
   It says why in a few words ("Your shift ended at 6:00"). The other routines are one tap away. Nothing starts by
   itself and nothing is sent to his phone; this is a suggestion on the screen only.
6. **Taps:** start the suggested routine in 1 tap; any other routine in 2.

### Slice C: the home twin
1. **Build my home twin.** On each gym routine (in the routine editor from T1), a **HOME TWIN** line shows its linked
   HOME form. **BUILD TWIN** reads each lift in the gym routine and picks the best bodyweight move for the same muscle
   group, using the swap ranker from T2 limited to `equipment: "Bodyweight"`. Sets carry over; rep ranges come from
   the bodyweight move.
2. **He reviews it.** The proposal shows lift by lift ("Barbell Bench Press → Incline Push-Up"), each one changeable
   from the bodyweight list or droppable. **SAVE TWIN** saves it as his HOME form for that routine. Nothing saves
   without that tap.
3. **Keeping it in step.** When he edits a gym routine that has a twin, the save confirmation adds one line: "Your
   home twin still has the old lifts. UPDATE TWIN?" Tapping it opens the same review. Ignoring it changes nothing.
4. **Gaps said plainly.** If a lift's muscle has no bodyweight move in the library, the review says so ("No home move
   for forearms yet") and leaves that slot out rather than guessing.
5. **Taps:** build and save a twin in 2 taps; update one after an edit in 2.

## Everything is his to change
Which HOME routine links to which gym routine. Every move in HOME A, B and C and in every twin. Every stretch routine:
its name, its stretches, their order, each hold and whether to do both sides. He can make new routines and delete the
starters; a **RESET** on each starter brings it back. The suggestion windows (2 hours after shift, 2 hours before
sleep, 1 hour after lifting) in MORE · Train settings, and an off switch for suggestions. The how-to text, as today.

## Design principles check (Vision, Nov 24)
- **Always says why:** the suggestion names the shift or sleep time behind it; the twin names each swap.
- **Nothing changes without his tap:** setup, twins and links all wait for a tap; suggestions only suggest.
- **Simple first:** one HOME button and one suggested stretch routine; everything else is a tap deeper.
- No streaks, badges or scores. A missed stretch is never mentioned.

## Scope
- **Slice A:** `exerciseLibrary.ts`, `exerciseHowTo.ts` (`TEMPLATE_TO_LIBRARY_ID` and twelve guides), a new
  `HomeStartChoice` component mounted in the TRAIN start area, the first-use review card. Tests: home moves appear in
  the library with their muscle groups and keep their ids; START AT HOME starts the linked HOME form; setup saves
  nothing until USE THESE; non-sequence mode offers HOME A, B, C; rotation advances only on a completed linked HOME
  workout with work, as today.
- **Slice B:** `stretchLibrary.ts`, stretch routines carried on an event like `TRAIN_PROGRAM_SET` (so they're in
  backups and export), a `StretchPlayer` component, a pure `stretchCues.ts` timing function beside `runningCues.ts`,
  the optional `routineCompleted` flag in `deriveRecoverySessionStatus`. Tests: cue timings including both sides,
  skip, +15 s and pause; spoken cues sent through the same bridge as run cues; a routine finished early or late saves
  the right status; old recovery sessions unchanged; the suggestion picks the right routine for fixtures at 6:30 AM
  after a shift, an hour before sleep, after a workout, and none at midday; editing, deleting and RESET of starters.
- **Slice C:** a pure `buildHomeTwin(routine, library)` using the T2 ranker; the twin review in the routine editor;
  the UPDATE TWIN line on routine save. Tests: each lift maps to a bodyweight move of the same muscle group; gaps are
  reported, not guessed; nothing saves without SAVE TWIN; updating after an edit.
- All three: 320 px layout and axe checks on each new screen.

## Excluded
Following along with video. Yoga flows and breathing programmes beyond the one breathing step. Progress photos or
flexibility scores. Any import from free-exercise-db (that's T7, which should dedupe against the home moves and
stretches added here). Sending a stretch reminder to his phone (a later choice for him).

## Acceptance
- **Phone check:**
  - On TRAIN, tap SET UP HOME, then USE THESE. Next time, START AT HOME · B starts HOME B in one tap.
  - Open any home move's how-to and read it.
  - At 6:30 AM after a shift, TRAIN suggests After shift and says why; start it, hear "Switch sides", finish it, and
    see it saved as a completed recovery session even though it was under 10 minutes.
  - Edit a stretch routine's hold time, then RESET it.
  - In the routine editor, BUILD TWIN on routine A, change one pick, SAVE TWIN, then start it at home.

## Decision record
- Stretching logs as recovery, because recovery already never touches the rotation or progression, which is what a
  stretch routine should do.
- The twin uses the swap ranker from T2, so a home swap and a mid-workout swap agree.
- Suggestions read the shift and sleep times the app already has, so he isn't asked for anything new.

## Stop and ask Gavin if
- Changing how a recovery session's status is worked out would change a Minimum Day or any other result for a day he
  has already logged.
- The shift and sleep times aren't available on days off or for a flip day, so the suggestion would have nothing to
  go on.
- A slice can't be built without editing the same parts of `TrainScreen.tsx` the TRAIN builder's open PR is changing.

## Risks
- **Clashing with the TRAIN builder:** keep new UI in new files and rebase before opening.
- **Health Bridge voice:** if the bridge isn't connected, the player still buzzes and shows the cue on screen.
- **Advice quality:** stretches are general wellness cues, not treatment. Cues say to stop if anything hurts.
