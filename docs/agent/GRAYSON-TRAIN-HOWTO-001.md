# GRAYSON-TRAIN-HOWTO-001 — setup, cues and mistakes for every library exercise, plus a free video link

- **Authorization:** Gavin, 2026-11-24. Backlog row **B5** (DELIGHT, ranked 9th), campaign plan **C4.13**. His
  pick on exercise how-to (Nov 24): written cues, a muscle map and a free official video link (the map is
  GRAYSON-TRAIN-BODYMAP-001). At 04:38 CT: **"Now let's start giving Claude stuff to work on. Work on finishing
  train"**. His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this
  brief is his approval of the defaults below.
- **Lane: FEATURE.** Bundled content and a read-only view, plus his own edits in localStorage. No domain event,
  table, Dexie version, Engine, notification or navigation change.
- **Starting commit:** `origin/master` `439129c`. Re-fetch before starting.
- **Builder:** Claude Code (TRAIN while Codex is offline). Branch `claude/grayson-train-howto-001`. Reviewer:
  Grok Bot. **Active PR:** pending.
- **Order and overlap:** Claude Code **#5** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after LOCKSCREEN-001. RUN-001, REST-001 and
  EDIT-001 all touch `TrainScreen.tsx` too.
  This brief touches `TrainScreen.tsx` only to add a HOW TO entry beside each exercise, so rebase on whatever has
  merged. GRAYSON-TRAIN-BODYMAP-001 follows and reads this brief's data. Recheck open PRs at build time; tracker
  to the oldest open PR.

## Objective and benefit
Today ten built-in movements have a setup, three cues, mistakes and alternatives (`CalibrationPreview.tsx`
`GUIDES`), and the other 44 of the 54 library exercises (`domain/workout/exerciseLibrary.ts`) have none (Parity
Scorecards M4). In the gym he has to leave BEYOND to check how a movement goes. After this, every library
exercise answers "how do I do this?" in BEYOND, offline, with one tap out to a free video when he wants to see it.

**Benchmarks (read 2026-11-24):**
- MuscleWiki gives step-by-step written directions and a video demonstration for each exercise
  ([MuscleWiki, App Store](https://apps.apple.com/us/app/musclewiki-workout-fitness/id1096827640); Scorecards M3,
  M4).
- ACE Fitness's free Exercise Library gives each exercise "a detailed description and photos to help ensure
  proper form", with a page per exercise and no sign-in
  ([ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/)).

**What we copy:** written setup and cues per exercise and a demonstration one tap away. **What we keep out:**
their words, photos and videos. Every line here is written fresh in plain words; video stays on its owner's site
behind a link (Scorecards: "Videos ... are never copied").

## Recommended defaults (approved when Gavin merges this brief)
1. **Content per library exercise:** a one-line role ("Horizontal press · chest and triceps"), a setup sentence,
   three short cues, up to two common mistakes and one alternative from the library. Same `Guide` shape as
   `CalibrationPreview.tsx`. Written by the builder in its own words from general training knowledge; nothing
   copied from MuscleWiki, ACE or any other source.
2. **The ten existing guides** move into the new shared module unchanged and are matched to their library
   entries, so there is one source of how-to text.
3. **Video link:** one link per exercise to the matching ACE Exercise Library page, only where the builder has
   opened that page and it shows the same movement. No match, no link (and say so in the PR's table). Never a
   search link, never a guessed address. Opens in the browser; needs internet; nothing embedded.
4. **Where it shows:**
   - In MORE → EXERCISE LIBRARY, each library row gets HOW TO, opening a sheet with the guide and WATCH ON ACE.
   - In TRAIN's live workout, each exercise gets the same HOW TO, opening the same sheet over the workout without
     leaving it or pausing rest.
   - The calibration preview keeps showing its guide, now from the shared module.
5. **Custom exercises** he made himself show their own note (existing) and no guide.

## What's editable, and what isn't yet
- **Editable:** in the HOW TO sheet, EDIT lets him change the setup, any cue, the mistakes and the video link for
  that exercise, or clear the link. His version is kept as his and wins; RESET puts the bundled text back. Stored
  in localStorage `beyond.exerciseHowTo.v1` (only his changes), added to `TRAVELLING_SETTINGS` in
  `persistence/settingsTransfer.ts` as "Exercise how-to edits".
- **Not editable yet:** the role line and the alternative (they come from the library's own facts).

## Design principles check (Vision, Nov 24)
- **Yours to change:** every guide line and link.
- **Fix, don't ask:** nothing asks; the text is there when he looks.
- **One tap for the usual:** HOW TO from the exercise.
- **Built around shift:** works offline in any gym, any hour.
- **Calm:** a sheet he opens; nothing appears unasked.
- **Always says why:** the role line says what the movement is for.
- **Simple first:** setup, three cues, two mistakes.
- **Tap or say it:** Delta can be asked as before; no change there.

## Scope
- `domain/workout/exerciseHowTo.ts` (new): `EXERCISE_HOW_TO: Record<libraryId, Guide & { videoUrl?: string }>`
  for all 54, and the template-id to library-id map for the ten built-ins.
- `ui/screens/train/CalibrationPreview.tsx`: read `GUIDES` from the new module.
- `ui/components/ExerciseHowToSheet.tsx` (new) and `ui/screens/train/exerciseHowToStore.ts` (new, edits).
- `ui/screens/more/ExerciseLibraryScreen.tsx` and `ui/screens/train/TrainScreen.tsx`: the HOW TO entries.
- `persistence/settingsTransfer.ts`: one entry.

## Excluded
- No images, animations or embedded video. No new exercises (54 stays 54). No body map (BODYMAP-001). No pinned
  per-exercise notes for library exercises (backlog B10).

## Files
- **In scope:** the files under Scope, their tests, screenshots.
- **Off limits:** `exerciseLibrary.ts` entries (read only), workout templates, Engine, `persistence/db.ts`.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** the `Guide` shape and the ten guides; the existing sheet styles; `closeStore.ts`'s storage pattern.
- **OWN:** the 44 new guides and the link table.
- **BUILD FROM SCRATCH:** the sheet.

## Acceptance
- `tests/exerciseHowTo.test.ts`: every one of the 54 library ids has a guide with a role, a setup, exactly three
  cues and one or two mistakes; the ten built-ins map to library ids and their text is unchanged; every video link
  starts `https://www.acefitness.org/resources/everyone/exercise-library/`; edits win and RESET restores.
- `tests/browser/ExerciseHowTo.test.tsx`: HOW TO opens from the library and from the live workout; during rest the
  countdown keeps running behind the sheet; EDIT saves and survives a reload; RESET restores; WATCH ON ACE is a
  link that opens a new tab; no link shows where none is set; keyboard only; axe clean; 320/360/412 px no overflow.
- The PR lists all 54 exercises with the ACE page each links to (or "no match"), so Gavin can scan it.
- Existing TRAIN and library tests stay green. `typecheck`, `check:architecture`, `check:risk`, build, focused tests
  in `TZ=UTC` and `TZ=America/Chicago`, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-TRAIN-HOWTO-001/` at 360 px (key ones 320 and 412): the sheet,
  the sheet over a live workout in rest, EDIT.
- **Device check (Gavin, Android):** in the gym, open HOW TO on a machine you use, then tap WATCH ON ACE. Then KEEP /
  REFINE / RETHINK.

## Decision record
`docs/decisions/GRAYSON-TRAIN-HOWTO-001.md`: own words only, ACE as the link source and why, the link table rule.

## Stop and ask Gavin if
- More than 15 of the 54 have no matching ACE page (then propose a second free source in the PR rather than
  guessing).
- A guide would need medical or injury advice beyond plain form cues.

## Risks and checks
- **Copying:** the reviewer spot-checks ten guides against ACE's wording; any close match is rewritten.
- **Dead links:** a link is only data; a dead one is fixed with EDIT, and the PR's table makes the next check fast.
