# GRAYSON-TRAIN-BODYMAP-001 — tap a muscle to find its exercises, and a fast swap when a machine is taken

- **Authorization:** Gavin, 2026-11-24. Backlog row **B7** (DELIGHT, ranked 25th). His pick on exercise how-to
  (Nov 24) included a muscle map. At 04:38 CT: **"Now let's start giving Claude stuff to work on. Work on finishing
  train"**. His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this
  brief is his approval of the defaults below.
- **Lane: FEATURE.** A read-only view of the bundled library and his own exercises, plus names offered as swap
  quick-picks through the existing free-text substitution. No domain event, table, Dexie version, Engine or
  navigation change.
- **Starting commit:** `origin/master` `439129c`. Re-fetch before starting.
- **Builder:** Claude Code (TRAIN while Codex is offline). Branch `claude/grayson-train-bodymap-001`. Reviewer:
  Grok Bot. **Active PR:** pending.
- **Order and overlap:** Claude Code **#8** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after NOTES-001 and GRAYSON-TRAIN-HOWTO-001, whose shared module (`domain/workout/exerciseHowTo.ts`,
  with the template-to-library map) this reads, and whose HOW TO sheet each map result opens. Both touch
  `ExerciseLibraryScreen.tsx` and the substitution area of `TrainScreen.tsx`. Recheck open PRs at build time;
  tracker to the oldest open PR.

## Objective and benefit
When a machine is taken, he needs another exercise for the same muscle now, between sets. Today the swap offers his
recent substitutions and his own exercise names (TRAIN-CREATE-003), as free text. After this, a body map shows
which muscle the current exercise works and lists every exercise for it, and one tap puts the swap in.

**Benchmark:** MuscleWiki's interactive body map: tap a muscle, see its exercises
([MuscleWiki, App Store](https://apps.apple.com/us/app/musclewiki-workout-fitness/id1096827640); Parity Scorecards
M1). **What we copy:** tap a muscle, see its exercises. **What we keep out:** their artwork (ours is drawn fresh as
simple shapes) and any "muscle growth" or coverage score (the map is navigation only, per
`docs/GRAYSON_TRAIN_INTELLIGENCE.md` §8: "never a grown map").

## Recommended defaults (approved when Gavin merges this brief)
1. **The map:** a simple front and back figure in BEYOND's own line style, one SVG, drawn for this app. Tappable
   regions for the library's own groups: Chest, Back, Shoulders, Arms, Core, Legs, Glutes. A "Full body" chip under
   the figure for the eighth group. No colours that grade anything; the selected region is outlined, nothing else.
2. **Tap a region:** a list of that group's exercises, library and his own, each with its equipment and HOW TO
   (from HOWTO-001). His own exercises come first.
3. **In MORE → EXERCISE LIBRARY:** a BY MUSCLE toggle opens the map above the existing list.
4. **In TRAIN's live workout, the swap:** beside the existing quick-picks, FIND BY MUSCLE opens the map with the
   current exercise's group already selected (from the template-to-library map; nothing selected if unknown). Tapping
   an exercise fills the existing substitution field with its name, exactly as a quick-pick does today. Equipment
   filter chips (Machine, Cable, Dumbbell, Barbell, Bodyweight) narrow the list; none is on by default.
5. **Keyboard and screen readers:** every region is also a button in a list ("Chest, 8 exercises"), so the map is
   never the only way in.

## What's editable, and what isn't yet
- **Editable:** which group one of his own exercises belongs to, from the map's list (the existing custom exercise
  edit); his equipment chip choice is remembered in localStorage `beyond.bodyMap.v1` (doesn't travel; it's a view
  setting).
- **Not editable yet:** the groups themselves and the library's group for a library exercise.

## Design principles check (Vision, Nov 24)
- **Yours to change:** his exercises' groups; his filter.
- **Fix, don't ask:** the swap opens on the right muscle.
- **One tap for the usual:** FIND BY MUSCLE, then the exercise.
- **Built around shift:** works offline at any gym hour.
- **Calm:** navigation only, no scores or colours that judge.
- **Always says why:** each region names its count; each exercise opens its HOW TO.
- **Simple first:** eight groups, as the library already has.
- **Tap or say it:** unchanged.

## Scope
- `ui/components/BodyMap.tsx` (new, with the SVG inline) and `ui/components/bodyMap.css`.
- `application/exerciseByMuscle.ts` (new, pure): library plus custom exercises grouped, his first, filtered by
  equipment.
- `ui/screens/more/ExerciseLibraryScreen.tsx`: BY MUSCLE.
- `ui/screens/train/TrainScreen.tsx`: FIND BY MUSCLE in the substitution area only.

## Excluded
- No finer muscles than the eight groups; no secondary muscles; no coverage or growth view (C-row Sets per muscle
  group, H21, is separate); no new exercises; no change to how a substitution is stored.

## Files
- **In scope:** the files under Scope, tests, screenshots.
- **Off limits:** `exerciseLibrary.ts` entries, `exerciseHowTo.ts` content, Engine, `persistence/db.ts`.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** `EXERCISE_LIBRARY`, custom exercises, the HOW TO sheet, the substitution quick-pick path.
- **OWN:** grouping and the filter.
- **BUILD FROM SCRATCH:** the figure.

## Acceptance
- `tests/exerciseByMuscle.test.ts`: every library exercise lands in exactly one group; his own come first; archived
  ones are left out; the equipment filter narrows correctly; an unknown current exercise selects nothing.
- `tests/browser/BodyMap.test.tsx`: tapping each region lists its exercises; the list-button way in works by keyboard;
  FIND BY MUSCLE opens on the current exercise's group; tapping an exercise fills the substitution field and saves
  exactly as a quick-pick does; rest keeps counting behind it; axe clean; 320/360/412 px no overflow, map legible
  at 320.
- Existing TRAIN, substitution and library tests stay green. `typecheck`, `check:architecture`, `check:risk`, build,
  focused tests in `TZ=UTC` and `TZ=America/Chicago`, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-TRAIN-BODYMAP-001/` at 360 px (key ones 320 and 412): map with
  Chest selected; FIND BY MUSCLE from a live workout; equipment filter on.
- **Device check (Gavin, Android):** mid-workout, pretend a machine is taken, tap FIND BY MUSCLE and swap in another
  exercise. Then KEEP / REFINE / RETHINK.

## Decision record
`docs/decisions/GRAYSON-TRAIN-BODYMAP-001.md`: original artwork, navigation only, eight groups and why.

## Stop and ask Gavin if
- The figure can't be made readable at 320 px with eight regions.
- The swap would need to store a link to the chosen exercise rather than its name.

## Risks and checks
- **Art:** drawn from simple shapes; the reviewer checks it doesn't trace any app's figure.
- **Wrong group:** a library exercise's group is the library's; his own exercises' groups are his to fix.
