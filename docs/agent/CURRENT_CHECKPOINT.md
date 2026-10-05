# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `7ea4533` (PR #179 merge).

- **Drop:** none active. `NOTES-CAPSULE-001` merged on Gavin's "A" (independent review APPROVE,
  PR Verification green on the reviewed head) and closed here. "Notes that go somewhere" is
  complete: NOTES-SWEEP-001 (#175), NOTES-HANDOFF-001 (#177), NOTES-CAPSULE-001 (#179).
- **Next (Queue):** WALKTHROUGH-001 (phone-size walk-through with screenshots, report only), then
  CLEANUP-002, then a week of field use; Gavin is setting up the review account.
- **Capsule review notes (non-blocking):** capsule events have no day, so History (grouped by
  day) never lists them; TODAY checks for due capsules on load only; any future code reading all
  events must not assume a day/mission/journal id.
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
