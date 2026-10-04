# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `6848d30` (PR #161
merge, HUD-001 closed).

- **Drop:** `BACKUP-AUTO-001` automatic backup: ARCHITECTURAL, `ACTIVE`. Built after Gavin's
  2026-10-04 go-ahead ("merge and build option A"); awaiting a separate review session and
  Gavin's merge.
- **Branch:** `claude/backup-auto-001`. **PR:** see `docs/agent/ACTIVE_DROP.md` `pr:`.
- **Done:** MORE → Data safety has an AUTOMATIC BACKUP row (off by default; TURN ON, every
  1/3/7/14/30 days, default 7; CHECK A BACKUP). With it on and a backup due (none on record, or
  last one ≥ N days old), TODAY shows one line above the screen: "Backup due · 9 days old",
  BACK UP NOW (existing `shareBackup()`: share menu → Drive/Files/a file share; download on
  desktop), LATER (hides it for a day). Closing the share menu keeps the line. Once a month (the
  clock starts when it's turned on, so it never asks right after the first backup) the line asks
  "Check your latest backup": the chosen file goes through the existing `previewAnyRestore()`
  (no write) and each table's row count is compared with the device: "Backup from Oct 3
  restores 1,204 records ✓" or the tables that differ. Settings, snooze and last-check time in
  `localStorage` (`src/persistence/autoBackup.ts`), reached only through
  `src/application/autoBackupQueries.ts`. No schema, backup-format, restore or dependency change.
- **Tests:** `tests/integration/autoBackup.test.ts` (due/snooze/monthly rules, count comparison,
  fresh backup matches, changed device names the table, the check never writes, the file still
  restores, a non-backup file is rejected writing nothing); `tests/browser/AutoBackup.test.tsx`
  (off by default, line on TODAY at 360 px with 44 px buttons, BACK UP NOW shares a dexie file and
  clears it, cancelled share keeps it, LATER, MORE toggle + interval). Three existing MORE tests
  now pick the reminder row's TURN ON/"Off." with `.first()` and the restore picker by its label,
  since MORE has a second TURN ON and file picker.
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run` earlier in
  the build: 1,957 passed, 5 failures from the duplicate TURN ON / file picker selectors, fixed
  and re-run (affected files 165/165); compat + restore tests 39/39; `build` OK; `git diff
  --check` OK. Checked in the browser at 360 px; screenshot in
  `docs/agent/screenshots/BACKUP-AUTO-001/`.
- **Left:** independent review at the PR's exact head (format compatibility, the check is
  read-only); Gavin approves the merge; close with `factory-drop.mjs close`, and add the
  as-built `docs/UX_DECISIONS.md` entry.
- **Open risks:** the line shows only on TODAY (the screen BEYOND opens to). The restore check
  can't verify the file's contents beyond what the preview reads (its table list and counts).
  Carried over: HUD follow-ups (stale `tokens.css` contrast comment; ticks not on `.tool-label`);
  @fontsource kept only for Weekly; `factory:status` needs `GITHUB_TOKEN`; 56 merged branches plus
  `codex/dup-meal-001`, `codex/duplicate-meal-prompt`, `claude/hud-001` and
  `claude/hud-001-close` await deletion by Gavin.
- **Next in Queue after this:** `PR-CARDS-001`, `BODY-TIMELINE-001` (ROUTINE, written Drops).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. BACKUP-AUTO-001 after review: **A. Merge as is (recommended)** · B. Tune a detail first (say
   which) · C. Hold.
