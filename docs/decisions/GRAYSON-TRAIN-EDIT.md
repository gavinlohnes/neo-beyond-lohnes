# GRAYSON-TRAIN-EDIT — fix any logged set, live or past (owner go, 2026-11-24)

Gavin merged the [brief](../agent/GRAYSON-TRAIN-EDIT-001.md) (#642), which approves these defaults. Backlog E1, first
part.

- **Fix it where you see it:** any logged set in the live workout (FIX beside each set, warm-ups included) or in a
  past session's record (tap the set) opens one fix sheet. A skipped set can be filled in; a set can be removed; a
  forgotten set can be added to a finished (COMPLETED or PARTIAL) session.
- **No "Are you sure?":** every fix saves at once and shows Undo for 8 s (`FIX_UNDO_MS`). Later, the set's "edited"
  detail shows what it was and when it changed, with Put it back for the newest fix; a removed set stays listed as
  "removed" with Put it back.
- **Counts everywhere:** the one retracted-set filter (`getUndoneSetIds` → `projectSetFixes`) means history, the
  recap, PRs, progression, stall findings, Weekly, search and the Day Ledger all read the corrected set. A typo PR
  goes away; a hidden real one appears.
- **Append-only:** `SET_CORRECTED` writes a new row (same set number, time and order) and retracts the old;
  `SET_REMOVED` retracts; `SET_ADDED` writes a row inside the session's window; `SET_FIX_UNDONE` cancels the newest
  fix on a set. Recorded on the workout's own lived day. No Dexie change.
- **Never changes:** the session's status or length, the A/B/C sequence or which workout comes next (E1b).
