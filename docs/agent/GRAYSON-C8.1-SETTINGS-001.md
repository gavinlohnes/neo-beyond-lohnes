# GRAYSON-C8.1-SETTINGS-001 — Settings travel with the backup

- **Owner authorization:** Gavin, 2026-11-24, "Go ahead and start" (C8.1 / quick win Q6, recommended as the next
  objective).
- **Lane:** PROTECTED (backup contract). Independent exact-head review, green CI, Gavin's merge. **Builder:** Claude
  Code. **Starting commit:** master `d2a1616a`. **Branch:** `ccr-380c4225-1es42i`.
- **Operator benefit:** a new or reset phone restored from a backup gets his setup back (Alfred cap and modes, Delta's
  voice, reminders, rest timers, hidden features, vision mode, MORE favorites), not only his records. Keys and
  sign-ins never leave the phone.
- **Rules:**
  - Ten allowlisted localStorage keys travel (`src/persistence/settingsTransfer.ts`, `TRAVELLING_SETTINGS`).
  - **Stays on the phone:** secrets and sign-ins (Alfred key, IFTTT config with its key, Google Calendar store, Drive
    backup link); stealth (SUIT-001: never a backup record); device bookkeeping (drafts, seen and snooze flags,
    clocks, spend counters, caches).
  - **Format:** the dexie-export-import document is unchanged. The preferences sit beside it in one extra top-level
    block, `beyondSettings: { version: 1, values }`, which dexie-export-import and older BEYOND builds ignore. The
    legacy `BEYOND_BACKUP` path is untouched.
  - **Every native export carries it:** download, share and the encrypted Drive backup.
  - **Restore stays replace-only and preview-first:**
    - The settings apply only after the data import succeeds.
    - The block is authoritative for the allowlist: a key it holds is written; an allowlisted key it lacks returns
      to its default.
    - A backup with no block (made before C8.1) leaves this phone's preferences as they are.
    - Keys outside the allowlist, non-string or oversized (>16 KB) values, and unknown block versions are ignored.
  - **The restore preview says what happens:** "Settings: N preferences replace this phone's. Keys and sign-ins stay
    as they are.", or that the backup has none.
- **REUSE:** the existing native export and replace-only restore (`backup.ts`, `restore.ts`). Each preference's own
  reader already falls back to its default on a malformed value. **OWN:** the allowlist and the block.
  **BUILD FROM SCRATCH:** none.
  - **Rejected:** a new Dexie `settings` table. It would need a schema migration and moving every preference out of
    localStorage. Moving preferences into IndexedDB stays possible later.
- **Acceptance:**
  - `tests/persistence/settingsTransfer.test.ts`:
    - every allowlisted key round-trips;
    - no secret or device-only key is exported or overwritten;
    - replace-only semantics;
    - a pre-C8.1 backup leaves preferences alone;
    - hostile blocks are ignored;
    - allowlist drift guard: every key must be one the app really uses.
  - `DriveBackupKey`: the encrypted backup carries the settings and not the Alfred key.
  - `RestoreCompat`: the preview line, both ways.
  - Existing restore-compat, backup and MORE suites still pass.
