# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (reviewer/integrator).** `origin/master` at `02f5c66` (PR #182
merge). CLEANUP-002 is merged and closed; no Drop is active.

- **Drop:** `CLEANUP-002` gym mode and TODAY polish: ROUTINE, `CLOSED` at integration `02f5c66`.
  **PR:** [#182](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/182), merged after an
  independent review. Close-out branch `claude/cleanup-002-close` (this docs PR).
- **Done:** findings 1–2 (gym mode "Last set" line with PR tag and UNDO), 3 (TODAY lines under the
  header), 4 (day off: Attention points to the sweep; TODAY says "task"), 11 (dominant TODAY card
  centered), 13 (work-context change re-reads the sweep), and a failed sweep UNDO shows a message.
  The first CI run failed: the 44px size checks for the backup and shift-handoff buttons measured
  mid fade-in (43.99999). The tests now finish animations before measuring, and an App-level test for
  finding 13 was added.
- **Verification run:** reviewer: `check:architecture` OK; `typecheck` OK; targeted browser suites
  green; mutation checks (PR tag, banner position, App wiring) each caught; PR Verification green
  on head `30abdc1`.
- **Next:** CLEANUP-003 (findings 5–10, 12, Windows test timeouts), then a week of field use;
  Gavin is setting up the review account.
- **Review notes (non-blocking):** TODAY's lines now remount when a sweep closes (TODAY reloads), so
  a half-typed shift note would be lost if a sweep closes at the same moment.
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
