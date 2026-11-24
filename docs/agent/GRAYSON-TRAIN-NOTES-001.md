# GRAYSON-TRAIN-NOTES-001 — your own note on any exercise, shown in the live workout

- **Authorization:** Gavin, 2026-11-24. Backlog row **B10** (SHAPE, ranked 28th): "Partly built: exercises you
  add yourself already take a note. Left: a note on library exercises, shown in the live workout." At 04:38 CT:
  **"Now let's start giving Claude stuff to work on. Work on finishing train"**. His rule: **"I should be able to
  edit and tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: FEATURE.** The backlog row guessed PROTECTED for a new stored field. This brief stores notes as a
  validated `localStorage` preference that travels with settings, the same as HOWTO-001's edits, so there is no new
  table, Dexie version, event, Engine, TODAY or notification change. If the builder finds it can't be done that way,
  stop and ask (it would become PROTECTED). Another builder's PASS, green CI; Gavin merges.
- **Starting commit:** `origin/master` `e43ba36` (#659 merged). Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-train-notes-001`. Reviewer: Grok Bot. **Active PR:** pending.
- **Order and overlap:** Claude Code **#7** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after GRAYSON-TRAIN-HOWTO-001, which adds the template-id to library-id map and the HOW TO
  entry in the live workout. This brief reuses that map and sits next to that entry. It shares
  `ui/screens/train/TrainScreen.tsx` and `ui/screens/more/ExerciseLibraryScreen.tsx` with HOWTO-001, BODYMAP-001
  and EDIT-001: rebase on whichever merges first. Tracker to the oldest open PR.

## Objective and benefit

He writes "Seat 4, handles at chest height" once on Machine Chest Press, and every time that exercise comes up in a
workout the line is right there under its name. No more re-finding seat settings, grip or which cable stack, and no
notes app on the side.

**Benchmark:** Hevy lets you pin a note to an exercise so it shows each time you do it
([Hevy exercise programming options](https://www.hevyapp.com/features/exercise-programming-options/);
[Hevy on the App Store](https://apps.apple.com/za/app/id1458862350); SCORECARDS row H13). Copy the behaviour, not
the look or the words.

**What's already there:** exercises he makes himself keep `notes` (`domain/workout/customExercise.ts:25`), shown in
MORE → EXERCISE LIBRARY (`ExerciseLibraryScreen.tsx:37`) but **not** in the live workout. Library and built-in A/B/C
exercises take no note at all.

## Recommended defaults (approved when Gavin merges this brief)
1. **One note per exercise,** plain text, up to 140 characters, one line on screen (wraps to two at 320 px).
2. **Same exercise, same note:** a built-in A/B/C exercise and its library entry share one note, through
   HOWTO-001's template-id to library-id map. An exercise he made himself uses its existing `notes` field, so it
   never has two notes.
3. **Where it shows:**
   - Live workout: one muted line under the current exercise's name, "Your note: Seat 4, handles at chest height".
     Nothing shows when there's no note, not even an empty prompt.
   - Live workout: a small **NOTE** control beside HOW TO adds or edits it in place, without leaving the workout or
     pausing rest.
   - MORE → EXERCISE LIBRARY: library rows show the note the same way as custom rows, with the same edit control.
4. **Substitutions:** when he swaps in another exercise during a session (the free-text `substitutedName`), the
   planned exercise's note still shows, because it's usually about the same machine area. No note is kept for a
   free-text name.
5. **Delta:** doesn't read or mention notes in this slice.

## Everything is his to change
- Add, edit or clear any note from the live workout or the library. Clearing it removes the line.
- Stored in `localStorage` key `beyond.exerciseNotes.v1` as `{ [noteKey]: { text, updatedAt } }`, validated on read
  (bad JSON or an over-long note falls back to nothing for that key, never a crash), and added to
  `TRAVELLING_SETTINGS` in `persistence/settingsTransfer.ts` as "Exercise notes", so it moves with his settings and
  native backup.
- For his own exercises, the note is saved through the existing `updateCustomExercise` (`application/
  exerciseLibraryCommands.ts`), not the new key.

## Design principles check (Vision, Nov 24)
- **Yours to change:** every note, everywhere it shows.
- **Fix, don't ask:** nothing asks for a note.
- **One tap for the usual:** NOTE beside HOW TO.
- **Built around shift:** offline, any gym, any hour.
- **Calm:** one muted line, only when he wrote one.
- **Always says why:** "Your note:" says whose words they are.
- **Simple first:** one line of text.
- **Tap or say it:** typing only in this slice.

## Scope
- `ui/screens/train/exerciseNotesStore.ts` (new): read, write, clear, validation, `noteKeyFor(exerciseId)`.
- `ui/components/ExerciseNoteLine.tsx` (new): the line and its inline editor.
- `ui/screens/train/TrainScreen.tsx`: the line and NOTE in the live workout.
- `ui/screens/more/ExerciseLibraryScreen.tsx`: the line and edit on library rows.
- `persistence/settingsTransfer.ts`: one entry.

## Excluded
- Notes per workout or per set, photos, voice notes, Delta reading notes, notes on runs. No change to
  `exerciseLibrary.ts`, workout templates, Engine, `persistence/db.ts` or events.

## Files
- **BUILD:** the two new files above; `tests/exerciseNotesStore.test.ts`.
- **OWN (edit):** `TrainScreen.tsx`, `ExerciseLibraryScreen.tsx`, `settingsTransfer.ts`.
- **REUSE:** HOWTO-001's template-id to library-id map, `updateCustomExercise`, the `beyond.*.v1` validation
  pattern, HOWTO-001's sheet styles.

## Acceptance
- `tests/exerciseNotesStore.test.ts`: a note set on the library id shows for the built-in template id and the other
  way round; a custom exercise's note reads and writes its own `notes`; 141 characters refused; bad stored JSON
  ignored; clear removes the key; settings transfer round trip keeps notes. Run under `TZ=UTC` and
  `TZ=America/Chicago` (`updatedAt` is ISO, nothing depends on the day).
- Browser tests: add a note in the library, start workout A, see it under the exercise; edit it mid-rest and the
  rest countdown keeps running; clear it and the line goes; a substituted exercise still shows the planned note;
  keyboard only; axe clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-TRAIN-NOTES-001/` at 360 px (key ones at 320 and 412): live
  workout with and without a note, the inline editor, a library row with a note.
- **Device check (Gavin):** add "Seat 4" to Machine Chest Press, start workout A, see it there; edit it during rest.

## Decision record
- Preference store over a new table: notes are his settings for an exercise, not history, and HOWTO-001 already
  stores his edits this way. Lower lane, same backup path.
- One note shared between built-in and library entries, so he never wonders which copy he's editing.

## Stop and ask Gavin if
- HOWTO-001 isn't on master, or its id map doesn't cover the ten built-ins.
- Notes can't travel with settings or native backup without a new table.
- Showing the line pushes the set controls below the fold at 320 px.

## Risks
- **Lost on a browser reset without a backup:** same as every other preference; settings transfer covers it.
- **Shared files with three other TRAIN briefs:** keep the change to one line component and two insertions.
