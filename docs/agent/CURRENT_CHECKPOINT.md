# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `3f424b7` (PR #173 merge).

- **Drop:** none active. `GYM-002` cue text merged on Gavin's "A" (PR #173, independent review
  APPROVE, PR Verification green on the reviewed head) and closed in this branch. Gym mode is
  complete: GYM-001 (#170), GYM-POLISH-001 (#171), GYM-002 (#173).
- **This branch:** `claude/gym-002-close`: Drop close, Queue cleared (Done note), as-built line in
  `docs/UX_DECISIONS.md`, and the review's one code note (Stepper's doc comment moved back above
  `Stepper` in `GymMode.tsx`; comment only).
- **Queue:** empty — Gavin adds the next item. Parking lot left: Notes that go somewhere; Data
  views (after the F1 review, ~Oct 25); open-source parts to evaluate.
- **Field issues:** none open.
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
1. What goes into the Queue next: **A. Notes that go somewhere (recommended; the last parking-lot
   item not waiting on the F1 review)** · B. Nothing yet; use Gym mode for a while and send field
   notes · C. Something else (say what).
