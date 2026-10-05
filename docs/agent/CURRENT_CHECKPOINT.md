# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `8f0565a` (PR #174).
Gavin queued "Notes that go somewhere" with rulings 1A (three Drops: sweep, handoff, capsule),
2A (handoff/capsule stored as events like cue text), 3 "A and B" (sweep choices DONE / MAKE IT A
TASK / KEEP plus DELETE); recorded in the roadmap Queue, `docs/UX_DECISIONS.md` and three Drops.

- **Drop:** `NOTES-SWEEP-001` day-off notes sweep: ROUTINE, `ACTIVE`. Branch
  `claude/notes-sweep-001`. **PR:** [#175](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/175).
- **Done:** `ui/components/NotesSweep.tsx` above TODAY (App) when the active day is OFF and open
  notes exist; DONE / MAKE IT A TASK / KEEP / hold DELETE with UNDO; summary line; TODAY remounts
  after a sweep (App `todayRefreshKey`) so its capture count matches. New `deleteCaptureItem` /
  `restoreCaptureItem` in `commands.ts` (capture rows are mutable rows, not events);
  `application/notesSweepQueries.ts`.
- **Tests:** `tests/browser/NotesSweep.test.tsx` (5: day off vs work day, each choice's effect and
  obligation, quick tap doesn't delete, hold deletes, UNDO restores the exact row, KEEP writes
  nothing, summary wording, 44 px, no overflow at 360).
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 1,999 passed, 0 failed; `build` OK; `git diff --check` OK.
- **Left:** review, merge on green, close. Next: `NOTES-HANDOFF-001` then `NOTES-CAPSULE-001`
  (both HIGH-RISK; storage already ruled 2A, Gavin approves each merge).
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
  `claude/hud-002-close`, `claude/gym-001`, `claude/gym-polish-001`, `claude/gym-polish-001-close`, `claude/gym-002`, `claude/gym-002-close`, `claude/gym-polish-001`, and
  `claude/gym-polish-001-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
