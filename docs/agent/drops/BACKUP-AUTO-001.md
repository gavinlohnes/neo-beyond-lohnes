---
id: BACKUP-AUTO-001
baseline: 5538f0f7750905baa8116a54cd9218a23a7be6ec
risk_tier: ARCHITECTURAL
---

# BACKUP-AUTO-001 // AUTOMATIC BACKUP (WEB APP)

## Mission

Opt-in scheduled backup to a destination Gavin picks, plus a monthly restore check, with no
server. Owner brief 2026-10-04 (Queue item 2). Web-app part only.

## Approved baseline

`origin/master` at `5538f0f7750905baa8116a54cd9218a23a7be6ec` (update to fresh master before init, as in other Drops).

## Risk classification

ARCHITECTURAL: touches the backup flow in `src/persistence/backup.ts`. The backup FORMAT is
unchanged (still `dexie-export-import`); restore stays replace-only with preview first. **Owner
picked (a), 2026-10-04 (decision 2A): no Google account or OAuth.** Buildable now; the merge
still waits for the owner (Architectural).

## Authorized scope

A web app can't run on a timer while closed, and Android Chrome has no folder-picker API, so
"scheduled" means **due on open**:

- Settings (MORE → Settings → Backup): AUTOMATIC BACKUP off/on, every N days (default 7), and a
  destination.
- **Chosen (a), no account:** when a backup is due and the app is opened, BEYOND shows one
  line "Backup due · BACK UP NOW" that calls the existing `shareBackup()` (Android share sheet:
  Drive, Files, a file share). After two weeks overdue it stays until done or snoozed.
- Not in scope (owner decision 2A): direct Google Drive upload / OAuth.
- **Monthly restore check:** once a month, "Check your latest backup": Gavin picks the file;
  BEYOND runs the existing `previewRestore()` (no write) and compares each table's row count with
  the live database: "Backup from Oct 3 restores 1,204 records ✓" or names the difference.
- Preferences and last-check dates in `localStorage` (same as `beyond:lastBackupAt`); no schema.

## Explicit exclusions

No server, no background sync/push, no change to backup format or restore semantics, no
automatic restore, no native Android code.

## Relevant authority / references

`.claude/rules/persistence.md` (format changes are High-Risk; restore is replace-only, preview
first); `src/persistence/backup.ts` (`shareBackup`, `previewRestore`, `getDaysSinceLastBackup`);
Drop 3's backup status line in MORE → Settings.

## Required invariants

Backup files are byte-compatible with today's restore; restore check never writes; nothing runs
unless the setting is on.

## Acceptance criteria

1. Off by default; turning it on shows the due line exactly when `getDaysSinceLastBackup() >= N`.
2. BACK UP NOW uses `shareBackup()`; the due line clears after a successful share.
3. Restore check reports matching counts for a fresh backup and names a mismatched table.
4. The restore check never writes (row counts unchanged; test).
5. Protected-fixture restore tests still pass.

## Required verification

`npm run check:architecture` · `npm run typecheck` · `npm run verify` · `git diff --check` ·
PR Verification green.

## Builder expectations

Build (a) only. Build, verify, PR `[NEEDS CLAUDE REVIEW] …`, handoff, stop.

## Reviewer expectations

Claude Code checks format compatibility and that the restore check is read-only.

## Integrator expectations

Owner approves the merge (Architectural); Claude Code closes the Drop.

## Stop / escalation conditions

Stop if anything would change the backup format or write during the check, or if (a) can't work
without an account.
