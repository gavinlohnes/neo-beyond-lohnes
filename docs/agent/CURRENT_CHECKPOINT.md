# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `ca1c899` (PR #181,
the walk-through report). Gavin ruled "Let's do B. All 13" on the walk-through findings; recorded
in the roadmap and `docs/UX_DECISIONS.md`, split into CLEANUP-002 and CLEANUP-003.

- **Drop:** `CLEANUP-002` gym mode and TODAY polish: ROUTINE, `ACTIVE`. Branch
  `claude/cleanup-002`. **PR:** see `docs/agent/ACTIVE_DROP.md` `pr:`.
- **Done:** findings 1–2 (gym mode "Last set" line with PR tag and UNDO), 3 (TODAY lines in a
  `banners` slot under the header), 4 (day off: Attention points to the sweep; TODAY says "task"),
  11 (dominant TODAY card centers its contents), 13 (work-context change re-reads the sweep), and a
  failed sweep UNDO now shows a message.
- **Tests:** `tests/browser/Cleanup002.test.tsx` (6); TodayScreen capture tests updated to the
  "task" wording.
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 2,023 passed, 0 failed; `build` OK; `git diff --check` OK.
- **Left:** review, merge on green, close. Then CLEANUP-003 (findings 5–10, 12, Windows test
  timeouts), then a week of field use; Gavin is setting up the review account.
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
  `claude/notes-sweep-001`, and `claude/notes-sweep-001-close`, `claude/notes-handoff-001`, `claude/notes-handoff-001-close`, `claude/notes-capsule-001`, `claude/notes-capsule-001-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
