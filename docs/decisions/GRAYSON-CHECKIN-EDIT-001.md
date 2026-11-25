# GRAYSON-CHECKIN-EDIT-001 — correct a check-in after you send it (owner go, 2026-11-24)

Gavin, 2026-11-24 01:26 CT: "I should be able to edit and tweak or correct everything in this app." Undo rule, 02:02 CT,
option 1 of three: Undo shows only after a fix or a removal; routine logs stay as OWNER-GO-001 left them. Merging the
brief ([#643](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/643)) approved its seven defaults; 02:24 CT: "Build
docs/agent/GRAYSON-CHECKIN-EDIT-001.md". [Brief](../agent/GRAYSON-CHECKIN-EDIT-001.md).

1. **Fix it where you see it, without losing UPDATE.** TODAY's check-in card keeps UPDATE (still records a new
   check-in), SAME AS LAST and ALL GOOD exactly as before. A separate FIX control (44 px, 16 px text) on the
   "Checked in HH:MM" line opens fix mode on today's latest check-in. In History, every check-in row and every
   "Check-in fixed" row has FIX. Fix mode is titled "Fix this check-in", opens with that check-in's current answers,
   hides SAME AS LAST, ALL GOOD and the "Previous check-in · reference" block, and saves with SAVE FIX.
2. **What can change:** energy, stress, mood, soreness and urge, in their own ranges. Never the time it was made.
3. **Today's latest check-in:** a fix re-works today's advice through the same evaluate-and-issue step a new check-in
   uses (`issueRecommendationForCheckIn`, shared with `submitCheckIn`, no Engine rule change). The old recommendation
   and any decision on it stay in history.
4. **An earlier or past check-in:** a fix changes history, trends, Delta's reading, the next draft and the Day Ledger.
   It never re-issues a past recommendation, and fixing an earlier check-in today re-issues nothing either.
5. **No "Are you sure?":** SAVE FIX writes at once and shows UNDO for `FIX_UNDO_MS` = 8 s (`useUndoWindow.ts`, shared
   with GRAYSON-FIX-UNDO-001 and GRAYSON-TRAIN-EDIT-001). Later, the fix sheet's "Edited · before and after" detail
   offers PUT IT BACK, which undoes the newest standing fix (repeat to walk further back). Undoing a fix of today's
   latest check-in re-works the advice again.
6. **The original is never lost.** Append-only: a fix adds a corrected row and `CHECK_IN_CORRECTED`; an undo adds
   `CHECK_IN_CORRECTION_UNDONE`. TODAY shows "· edited"; History marks the original "· edited" and shows
   "Check-in fixed: energy 1 → 4, …" with the before and after.
7. **Counts.** A fix is not a check-in: the day's check-in count is unchanged by fixes and undos. In the Day Ledger's
   burden, each fix adds one correction and each undo of a fix adds one more, so a fix alone is +1 and a fix with its
   undo is +2 (as `URGE_UNDONE` already counts).

Rules settled while building:

- **Opening a row opens the current version.** Tapping FIX on the original row (or any fix row) after a fix opens the
  chain's current answers, never a superseded row; a stale target is refused with a plain message, never silently.
- **Draft marker.** `draft` (CONFIRMED / ADJUSTED) describes how the original was submitted, so it stays on the
  original row and History still shows it there. The corrected row carries no `draft`; it carries
  `correctsCheckInId` instead.
- **Short-sleep reading** for a re-worked recommendation is read before the write transaction, as `submitCheckIn`
  does, and only when the check-in's day is the active day.
- **Readers.** Everything that summarises check-ins reads `getEffectiveCheckIns()` / `getLatestCheckIn()`; only
  `currentMaxSeq` (sequence numbers) and record integrity read raw rows. No Dexie version bump, no new table, no
  backup contract change: the corrected row and the two events ride the existing tables.
