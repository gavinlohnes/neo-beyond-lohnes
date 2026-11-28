# GRAYSON-OPEN-LIBRARY-001 — the open exercise library (about 800 exercises)

- **Authorization:** Gavin, 2026-11-26, 03:40 CT, picking **"Brief all four"** for "what fits now, a protein heads-up,
  timed and drop sets, and the 800-exercise library". Nov 24: TRAIN must fully replace MuscleWiki and Hevy. His rule:
  **"I should be able to edit and tweak or correct everything in this app."** Merging this brief approves the defaults
  below **and amends his earlier no-bulk-import ruling for this one dataset** (see "This amends a ruling").
- **Lane: PROTECTED** (new bundled third-party data and an amended owner ruling). No new table or Dexie version.
  Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` with the five TRAIN basics (B1–B5) merged. Re-fetch before starting. Built from `4eee98bb` (SET-TYPES-001 merged as #748).
- **Builder:** Claude Code, TRAIN lane. Branch `claude/grayson-open-library-001`. **Reviewer:** a fresh-context
  reviewer.
- **Order:** Claude Code, after the TRAIN basics and alongside or after SET-TYPES-001, in
  [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md).

## This amends a ruling
Three docs say the library stays hand-authored and that a bulk import of free-exercise-db is rejected:
`docs/agent/CAPABILITY_MAP.md` (WORKOUT CREATION / EXERCISE LIBRARY, "Rejected"), `docs/UX_DECISIONS.md` ("A bundled
reference list is inert, hand-authored data, never a bulk-imported third-party database") and
`docs/GRAYSON_INTEGRATED_HEALTH_MISSION.md` ("DEFER BULK REUSE … until separately amended"). Gavin's merge of this
brief is that amendment, for free-exercise-db only. The build PR updates all three lines to say so, with the date and
this brief's ID. Nothing else in them changes: wger's code stays rejected.

## Objective and benefit
The library has 55 hand-written exercises (`domain/workout/exerciseLibrary.ts`), each with a hand-written how-to
(`exerciseHowTo.ts`). Hevy and MuscleWiki each search hundreds. When he wants a movement that isn't there, he has to
make it himself.

After this, the library search also finds about 800 exercises from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db), an open, public-domain set (its README says "800+
exercises" under the Unlicense). Each comes with its muscles, equipment, level and step-by-step instructions, and can be
added to any routine like his own. His 55 stay as they are and come first.

## Recommended defaults (approved when Gavin merges this brief)
1. **Source:** free-exercise-db at one pinned commit, recorded in the data file's header and in a `NOTICE` line
   (Unlicense; data from the yuhonas/free-exercise-db project). The data, not its pictures: no images in this brief.
2. **Bundled, lazy:** a generated `public/` or `src/data/` JSON file, loaded only when he opens the library search or
   picks an exercise, so the first screen's size doesn't grow. Works offline once loaded.
3. **IDs:** `fedb-` plus the dataset's own id, so they never collide with his. Stable across updates of the pinned
   commit.
4. **Muscles:** its primary muscle maps to one of his eight groups (`MuscleGroup`) through one written table (for
   example quadriceps, hamstrings and calves to Legs; lats, middle back and lower back to Back; biceps, triceps and
   forearms to Arms; abdominals to Core). Secondary muscles are kept for SETS-PER-MUSCLE later.
5. **Which ones show:** strength, powerlifting, olympic weightlifting, strongman and plyometrics. Stretching and cardio
   entries are hidden by default, behind one "Show stretches" toggle.
6. **Duplicates:** where one of his 55 has the same name (ignoring case and punctuation), his wins and the open one is
   hidden.
7. **Rep range:** 8 to 12 by default, editable per exercise once he adds it, like his own.
8. **How-to:** his hand-written how-to wins where it exists. Otherwise the open set's steps show, labelled "From the
   open exercise set". The free video link stays only on his 55.
9. **His control:** HIDE any open exercise from search; EDIT one copies it into his own exercises (which he can then
   change freely) and hides the original. Nothing he's logged ever depends on the bundled file changing.
10. **Regenerating:** a script (`scripts/build-open-exercises.mjs`) fetches the pinned commit, maps, filters and writes
    the file, so an update is one reviewed PR.
11. **Tap bar:** find and add an open exercise to a routine in 3 taps (search, pick, ADD).

## Everything is his to change
Hide any exercise; copy and edit any exercise; show or hide stretches; rep range per exercise once added.

## Design principles check (Vision, Nov 24)
- **Yours to change:** hide or copy-and-edit anything. **Simple first:** his 55 first, the rest by search.
  **Always says why:** open entries say where their steps come from.

## Scope
- The script, the generated file, the mapping table, a `getOpenLibrary()` loader, search across both lists
  (`ExerciseLibraryScreen.tsx` and the routine picker), the hide list in settings, the copy-to-mine action, the three
  ruling lines, NOTICE.
- Tests: mapping covers every primary muscle in the file; filtered categories; his name wins on duplicates; ids are
  stable; lazy load (first screen bundle unchanged within 5 KB); an open exercise logs, progresses and exports like his
  own; hide and copy; offline after first load; 320 px and axe.

## Excluded
Pictures and animations (a later brief, once the size cost is known). wger data. Any change to his 55 or their how-to.

## Acceptance
- Phone check: open the exercise library and search "cable". You see your own matches first, then open ones with their
  muscles. Open one: its steps say "From the open exercise set". ADD it to Routine A and log a set. HIDE another: it's
  gone from search.

## Decision record
- One public-domain set, pinned, because its licence asks nothing of us and a pinned copy can't change under him.
- No pictures yet, because 800 sets of pictures would make the app much heavier.

## Stop and ask Gavin if
- The data file would add more than 1 MB to what the app downloads.
- The pinned commit's licence is anything other than the Unlicense.

## Risks
- **Search noise:** his 55 rank first and stretches start hidden.
- **Wrong muscle mapping:** one table, tested against every value in the file.
