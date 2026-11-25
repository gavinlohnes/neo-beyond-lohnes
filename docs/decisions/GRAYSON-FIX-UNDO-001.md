# GRAYSON-FIX-UNDO-001 — remove a log in one tap, and take it back (owner go, 2026-11-24)

Gavin, 2026-11-24 01:26 CT: "I should be able to edit and tweak or correct everything in this app." Undo rule, 02:02 CT,
option 1 of three: Undo shows only after a fix or a removal; routine logs stay as OWNER-GO-001 left them. Merging the
brief approved its seven defaults; 02:24 CT: "Build docs/agent/GRAYSON-CHECKIN-EDIT-001.md … then GRAYSON-FIX-UNDO-001."
[Brief](../agent/GRAYSON-FIX-UNDO-001.md). The brief names this file `GRAYSON-FIX-UNDO.md`; DEV-FLOW-002 files a
decision under its brief's ID, so it is `GRAYSON-FIX-UNDO-001.md`.

This PR is **slice 1** of the two the brief allows ("Size: M … TODAY's log sheet first and BODY second"): the whole
model, every reader, TODAY's log sheet and History. BODY's five "Hold to delete" buttons and the measurement remove
control are slice 2, on this same model, and keep their holds until then.

1. **Remove in one tap.** TODAY's log entry sheet (meal, water, protein): REMOVE acts at once. No "Remove …?", no
   KEEP IT. Focus moves to UNDO, since REMOVE leaves with the entry.
2. **Undo for 8 seconds** after a removal or an amount fix (`FIX_UNDO_MS` = 8000 in `useUndoWindow.ts`, the same
   constant and lines as GRAYSON-CHECKIN-EDIT-001; whichever merges second rebases). Later, History's row for the
   removal offers **PUT IT BACK**.
3. **Undo after a fix** saves the amount from before the fix through the same `correct*` command, as one more
   correction in the same chain. History shows both. No new event.
4. **Routine logs stay quiet:** a new log's confirmation is the message only (OWNER-GO-001). Tested.
5. **Holds are untouched:** finishing a workout, ending the day, clean days and progress photos. BODY's log holds stay
   until slice 2.
6. **History tells the truth:** the removal row keeps its wording ("Meal log deleted.", "Water log undone.", …) and a
   new row says "Meal log put back." (Water, Protein, Sleep, Bodyweight, Measurement), each with its time. Rewording
   the existing removal rows to "Meal removed" was left out: existing History wording is covered by tests and isn't
   needed for the put-back to be clear.
7. **Counts:** `LOG_VOID_UNDONE` joins the Day Ledger's `CORRECTION_TYPES`, so remove then put back is +2.

Rules settled while building:

- **Model:** one event `LOG_VOID_UNDONE { commandId, voidEventId, voidedType }`, USER-sourced, under the removal's own
  `beyondDayId` (a measurement belongs to no day, so its put-back is unscoped like its removal). No Dexie version, no
  table, no index (the existing `type` and `beyondDayId` indexes serve it), no backup change: a native backup round
  trip keeps both events (tested).
- **One filter:** `activeVoids(events)` in `src/domain/logVoids.ts` (pure); `activeVoidedIds(events, type)` wraps it.
  Every reader of the six void types goes through it: `queries.ts` (`voidedLogIds` and protein), `bodyTrendQueries`,
  `commands` (retime, protein, body logs, `replaceGarminSleep`), `externalSleepQueries`, `garminSleep`,
  `measurementCommands`, `measurementQueries`, `nutritionCommands`, `nutritionQueries`, `searchQueries`,
  `wholePictureQueries` and `src/engine/dayLedger.ts` (its void lines only). Type-indexed reads now also fetch
  `LOG_VOID_UNDONE`. `historyCopy` only names events and needs no filter. No reader needs raw voids.
- **Commands:** `undoLogVoid(beyondDayId, voidEventId)` in `src/application/logVoidCommands.ts`, in
  `writeAtomically(DAY_WRITE_TABLES)`. Put back twice is a no-op; a removal it can't find is refused
  (`LOG_VOID_NOT_FOUND`). `putBackLogEntry(entryId)` finds the standing removal for UNDO.
- **Garmin (GARMIN-003 unchanged):** a SYSTEM removal is how Garmin steps aside for the owner's own sleep entry; it
  can't be put back by hand. Putting back the owner's own sleep entry runs `replaceGarminSleep` again, exactly as when
  it was first logged, so an imported night steps aside the same way it did before the removal.
- **Corrections after a put-back:** a put-back entry can be corrected and removed again; UNDO-001's "can't be
  corrected afterwards" holds only while the removal stands (amended in `docs/UX_DECISIONS.md`).
- **Nothing is re-evaluated:** removing a log never re-ran the Engine, so putting one back doesn't either.
