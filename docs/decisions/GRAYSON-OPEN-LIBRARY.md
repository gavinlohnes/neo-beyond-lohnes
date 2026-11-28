# GRAYSON-OPEN-LIBRARY — the open exercise library (owner go, 2026-11-26; amends the no-bulk-import ruling)

Gavin approved the [brief](../agent/GRAYSON-OPEN-LIBRARY-001.md) ("Brief all four"; TRAIN must fully replace MuscleWiki
and Hevy). Merging it approves the defaults below and amends the ruling that the exercise library stays hand-authored,
for **free-exercise-db's data only**. wger's code stays rejected; no pictures.

- **Source:** free-exercise-db, pinned at `f00c92c7` (Unlicense, checked by the script and recorded in the file and in
  `NOTICE`). `scripts/build-open-exercises.mjs` regenerates `src/data/openExercises.json`; an update is one reviewed PR.
- **Size and loading:** about 760 KB (about 150 KB compressed), loaded by a dynamic import only when he searches the
  library or the routine picker, so the first screen doesn't grow. The service worker precaches the chunk with the
  other scripts, so it works offline once loaded.
- **IDs:** `fedb-` plus the dataset's id; stable across updates of the pinned commit.
- **Muscles:** one table maps every primary muscle in the file to one of his eight groups (traps to Back, neck to
  Shoulders, abductors to Glutes, adductors to Legs); secondary muscles are kept for sets per muscle later.
- **What shows:** strength, powerlifting, olympic weightlifting, strongman and plyometrics. Stretching and cardio sit
  behind "Show stretches". A name he already has (his 55, A/B/C, his own) wins, ignoring case and punctuation.
- **Search, not browsing:** the open set appears only once he types, after his own and the library's matches, at most
  40 at a time ("Showing 40 of N").
- **Rep range** starts at 8 to 12, his to change once added. **How-to:** his hand-written one wins; otherwise the open
  steps, labelled "From the open exercise set".
- **His control:** HIDE takes one out of every search (SHOW THEM AGAIN brings them back); EDIT copies it into his own
  exercises (steps as its note) and hides the original. His choices travel with backups.
- **Nothing logged depends on the file:** a routine or workout saves the exercise's name with it, and history,
  records and export name it from there.
