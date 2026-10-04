# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (reviewer/integrator).** Baseline `origin/master` at
`fbe0820` (PR #171 merge: GYM-POLISH-001 gym screen follow-ups).

- **Drop:** none active. `GYM-POLISH-001` (ROUTINE) merged on green checks after an independent
  review (PR [#171](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/171), merge `fbe0820`)
  and closed in this branch (`claude/gym-polish-001-close`).
- **Done:** EXIT 56 px; focus moves into gym mode, Escape closes, focus returns to GYM MODE; a
  held wake lock is released before a new one is kept; a finished exercise offers NEXT EXERCISE.
- **Verification run (review):** `check:architecture` OK; `typecheck` OK; GymMode + TrainScreen
  browser tests and gymMode integration: 82 passed, 0 failed; removing the wake-lock release or
  the Escape handler fails the new tests. PR Verification green on the reviewed head `4c2e0ed`.
- **Next:** `GYM-002` cue text (HIGH-RISK): the builder writes the exact storage plan and stops
  for Gavin's sign-off before any code. Custom exercises already have an optional `notes` field;
  built-in exercises have no record of their own.
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
  `claude/hud-002-close`, `claude/gym-001`, `claude/gym-polish-001`, and
  `claude/gym-polish-001-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
