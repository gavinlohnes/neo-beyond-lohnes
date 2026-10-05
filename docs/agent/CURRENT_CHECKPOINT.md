# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (reviewer/integrator).** `origin/master` at `648f591` (PR #175
merge).

- **Drop:** `NOTES-SWEEP-001` day-off notes sweep (ROUTINE): independently reviewed, merged
  ([#175](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/175), merge `648f591`) on green
  PR Verification, and closed (`ACTIVE_DROP` CLOSED). Close-out branch
  `claude/notes-sweep-001-close` (docs only).
- **No Drop active.**
- **Next:** `NOTES-HANDOFF-001` shift handoff note (HIGH-RISK: new stored data; storage already
  ruled 2A, saved as events like cue text; Gavin approves the merge). Then `NOTES-CAPSULE-001`.
- **Verification run (review):** `check:architecture` OK; `typecheck` OK; NotesSweep, App,
  TodayScreen and captureInbox tests 118/118. Mutation checks: making KEEP resolve, or dropping
  the hold on DELETE, each fails 2 tests.
- **Sweep follow-ups (non-blocking, from review):** the sweep reads the day-off state on mount, so
  switching OFF/WORK on TODAY shows or hides its line only after TODAY is reopened; a failed UNDO
  restore shows no message; `convertCaptureToObligation` is not one transaction (pre-existing).
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
  `claude/notes-sweep-001`, and `claude/notes-sweep-001-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
