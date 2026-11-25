# GRAYSON-TRAIN-NOTES — your own note on any exercise, shown in the live workout (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-TRAIN-NOTES-001.md) approves these.

- **A preference store, not a new table:** a note is his setting for an exercise, not history.
  `beyond.exerciseNotes.v1` holds `{ [noteKey]: { text, updatedAt } }`, validated on read, and travels with his
  settings and native backup as "Exercise notes". HOWTO-001 already stores his edits this way. No table, no Dexie
  version, no event.
- **One note per exercise:** a built-in A/B/C exercise and its library entry share one note, through HOWTO-001's
  template-id to library-id map, so he never wonders which copy he's editing. His own exercises keep theirs in their
  existing `notes` field, saved through `updateCustomExercise`.
- **Where it shows:** one muted line, "Your note: …", straight under the exercise name in the live workout, with
  NOTE beside HOW TO. Editing it doesn't leave the workout or pause rest. Library rows and his own exercises show and
  edit it the same way. Nothing shows when there's no note.
- **Substitutions:** a swapped-in machine still shows the planned exercise's note. A free-text name keeps none.
- **Limits:** 140 characters, plain text. Delta doesn't read notes in this slice.
