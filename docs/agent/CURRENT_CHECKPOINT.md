# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `70e2ec2` (PR #183,
CLEANUP-002 closed).

- **Drop:** `CLEANUP-003` words and clutter: ROUTINE, `ACTIVE`. Branch `claude/cleanup-003`.
  **PR:** [#184](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/184).
- **Done:** walk-through findings 5 ("first time"), 6 (TRAIN advice reasons via a display map in
  `trainCopy.ts`; engine strings unchanged), 7 (BODY times without seconds), 8 (decision panel uses
  the capacity plain labels and "Nothing else needed attention first."), 9 (outlined timeline
  chips; the 60-day line hides while the timeline is open), 10 ("Planning to train today?" hides
  after a finished workout; `hasFinishedWorkoutOnDay`), 12 (one BACKUP row with EXPORT and SHARE;
  ARCHIVE row removed, same share action); factoryDrop tests get a 60 s timeout.
- **Tests:** `tests/ui/cleanup003Copy.test.ts`, `tests/browser/Cleanup003.test.tsx`; three tests
  updated to the plain wording.
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run` (no
  timeout flag): 2,030 passed, 0 failed; `build` OK; `git diff --check` OK.
- **Left:** review, merge on green, close. That finishes everything Gavin has approved; next is a
  week of field use (no new features) and the review account Gavin is setting up.
- **Known small thing:** on TRAIN the planned-work question can show for a moment before it hides
  after a finished workout (it waits on one read).
- **Open risks:** the backup line shows only on TODAY (the screen BEYOND opens to). If the share
  menu is cancelled, the line shows the browser's own wording (e.g. "Share canceled."). A
  weeks-old backup will usually report "differs from this device" in the restore check, because
  data has been logged since it was made. Carried over: HUD follow-up (ticks not on
  `.tool-label`, see decision 2); @fontsource kept only for Weekly; `factory:status` needs
  `GITHUB_TOKEN`. The timeline was never checked by eye in a browser; tests cover its layout.
  Branches awaiting deletion by Gavin: 56 merged branches plus `codex/dup-meal-001`,
  `codex/duplicate-meal-prompt`, `claude/hud-001`, `claude/hud-001-close`,
  `claude/backup-auto-001`, `claude/pr-cards-001`, `claude/pr-cards-001-close`,
  `claude/body-timeline-001`, `claude/body-timeline-001-close`, `claude/hud-002`,
  `claude/hud-002-close`, `claude/gym-001`, `claude/gym-polish-001`, `claude/gym-polish-001-close`, `claude/gym-002`, `claude/gym-002-close`,
  `claude/notes-sweep-001`, and `claude/notes-sweep-001-close`, `claude/notes-handoff-001`, `claude/notes-handoff-001-close`, `claude/notes-capsule-001`, `claude/notes-capsule-001-close`, `claude/cleanup-002`, `claude/cleanup-002-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
