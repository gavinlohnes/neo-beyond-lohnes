# GRAYSON-RESTORE-DRILL-001 — a full trial restore into a scratch copy, so he knows a new phone would get it all

- **Authorization:** Gavin, 2026-11-24. Backlog row **C8.2** (Base, trust): "Partly built: the monthly restore check
  already compares a backup's counts with this phone. Left: a full trial restore into a scratch copy"
  (`/mnt/project-files/grayson/BACKLOG.md`, row 40). 05:23 CT: **"Just keep pumping out work."** Merging this brief
  approves the defaults below.
- **Lane: PROTECTED** (backup integrity, DEV-FLOW-002 line 196; the backlog row said FEATURE, but a restore path is
  backup integrity). It never writes to his live database: a test proves it. No new
  table in his database, no Dexie version. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `f70a4a65` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-restore-drill-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#23** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It shares no files with
  the rows before it, so it can go whenever the next one waits on a merge.

## Objective and benefit
Once a month, MORE · Backup asks him to check a backup. `checkBackupFile` (`application/autoBackupQueries.ts`) reads the
file through the same preview a real restore uses and compares row counts per table with this phone
(`restoreCheckCopy.ts`: "Backup from Nov 3 restores 12,431 records ✓"). That proves the file reads and the counts match.
It doesn't prove the records import, that the app's upgrades run on them, or that the app can then read them, which
is what a new phone would do.

After this, the same place offers **TRY A FULL RESTORE**. GRAYSON imports the backup into a separate scratch copy, opens
it the way the app opens his real data, reads every area, and deletes the copy. It ends with one line: passed, or what
failed.

**Benchmark:** none new. The campaign plan's own C8.2 row, "Restore drill: would a new phone get it all?"

## Recommended defaults (approved when Gavin merges this brief)
1. **Where:** MORE · Backup, under the monthly check, and as a second button on the monthly line. It takes a file he
   picks, or for a Drive backup, the latest one (decrypted as a real restore would, `driveBackupService.ts`).
2. **What it does, in order:**
   1. Validates the file as the real restore does.
   2. Imports it with the real import path (`persistence/backup.ts`, `restore.ts`) into a scratch database with its own
      name, never his.
   3. Opens it with the current schema so every upgrade runs.
   4. Checks that every backed-up record id is present.
   5. Runs the app's main read queries against it: day summaries, sleep entries, weight trend, food diary, training
      history, running sessions, reminders, memories and work records.
   6. Applies the settings block (`beyondSettings`) to a scratch copy of the settings only.
   7. Deletes the scratch database whether it passed or failed.
3. **Result line:** "Full restore passed: 12,431 records in 41 areas opened in this version." On failure, it names the
   step and area in plain words, "Training history couldn't be read from this backup", and keeps the technical detail
   behind "Details", which also lists each table's count, as the campaign plan's C8.2 asks.
4. **Records it:** the drill counts as this month's restore check, and its date shows beside the last backup.
5. **Safety:** his live database is only read (for the counts). The scratch name is fixed, and any old scratch copy left
   by a crash is deleted before a new drill. If the phone is short of storage, it says so and stops before importing.

## Everything is his to change
Whether and when he runs it; which file. The monthly line's snooze works as today.

## Design principles check (Vision, Nov 24)
- **Always says why:** the line says what passed or which area failed. **Calm:** one line, his choice to run.
  **Simple first:** one button beside the check he already does.

## Scope
- `application/autoBackupQueries.ts` (`runRestoreDrill`), a scratch-database helper beside `persistence/restore.ts` that
  reuses the real import and the real `BeyondDb` class under another name, `restoreCheckCopy.ts`, `AutoBackupSettings.tsx`
  and `DriveBackupSettings.tsx` (+ css).
- Tests: a good backup passes and the scratch database is gone afterwards; a backup with a missing record, a broken row,
  an unknown table and an older schema each fail or upgrade as a real restore would; his live database is byte-for-byte
  unchanged after a pass and after a failure; a leftover scratch copy is cleared; a Drive backup decrypts and drills;
  the result line copy; 320 px and axe on the Backup screen with a result showing.

## Excluded
Restoring to his real data (the existing restore does that). Fixing a bad backup. A schedule for the drill.

## Acceptance
- Phone check: MORE · Backup → TRY A FULL RESTORE with this week's backup. It ends with "Full restore passed" and the
  record count, and the app's own data is unchanged.

## Decision record
- The real import path and the real database class, so the drill can't pass a backup a real restore would fail.
- The scratch copy is always deleted, so the drill leaves no second copy of his private data on the phone.

## Stop and ask Gavin if
- The real import path can't target a second database without changing how a real restore works.

## Risks
- **Touching live data:** the byte-for-byte unchanged test is the guard.
- **Storage:** a big backup doubles storage briefly; the check before importing is the guard.
