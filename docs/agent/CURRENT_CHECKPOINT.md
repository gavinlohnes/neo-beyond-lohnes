# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `7569c88` (PR #163
merge, BACKUP-AUTO-001 closed).

- **Drop:** `PR-CARDS-001` PR record cards: ROUTINE, `ACTIVE`. Built after Gavin's 2026-10-04
  "A" (merge #163, then build this). Routine: merges on green checks after Claude's review.
- **Branch:** `claude/pr-cards-001`. **PR:** [#164](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/164).
- **Done:** a record set shows a quiet `PR` tag (1px red outline, no fill, no sound/vibration)
  beside "heaviest yet (145 lb)"; TRAIN's pre-workout rows gain RECORDS, a list of cards (newest
  first: exercise, "Heaviest: 145 lb × 6" / "Most reps at 145 lb: 8", date). `getAllRecords()` in
  `application/personalRecordQueries.ts` walks finished sessions with the same
  `findSessionRecords` rule as the finish summary and Weekly; undone sets drop out. Read only.
- **Tests:** 3 new integration tests (newest first with names, undone PR disappears, count equals
  the finish summary's rule for the same sessions); TRAIN browser tests updated for the tag
  (outline, no audio/vibrate) plus a RECORDS test (order, tags, BACK, no overflow at 320/360/412).
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 1,966 passed, 0 failed; `build` OK; `git diff --check` OK.
- **Left:** review, merge on green, close the Drop; then `BODY-TIMELINE-001` (ROUTINE) is next.
- **Open risks:** the backup line shows only on TODAY (the screen BEYOND opens to). If the share
  menu is cancelled, the line shows the browser's own wording (e.g. "Share canceled."). A
  weeks-old backup will usually report "differs from this device" in the restore check, because
  data has been logged since it was made. Carried over: HUD follow-ups (stale `tokens.css`
  contrast comment; ticks not on `.tool-label`); @fontsource kept only for Weekly;
  `factory:status` needs `GITHUB_TOKEN`; 56 merged branches plus `codex/dup-meal-001`,
  `codex/duplicate-meal-prompt`, `claude/hud-001`, `claude/hud-001-close` and
  `claude/backup-auto-001` (and this close branch once merged) await deletion by Gavin.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
