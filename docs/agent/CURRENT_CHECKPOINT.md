# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `f45385e` (PR #177 merge).

- **Drop:** none active. `NOTES-HANDOFF-001` merged on Gavin's "A" (independent review APPROVE,
  PR Verification green on the reviewed head) and closed in `claude/notes-handoff-001-close`.
- **New owner rulings (2026-10-04, recorded in the roadmap Queue and `docs/UX_DECISIONS.md`):**
  finish the time capsule; then WALKTHROUGH-001 (phone-size walk-through with screenshots, report
  only); CLEANUP-002 (review-note cleanup); then a week of field use with no new features; and a
  separate GitHub review account that Gavin creates (Claude never creates accounts or handles
  its token).
- **Next:** `NOTES-CAPSULE-001` (HIGH-RISK; storage ruled 2A; Gavin approves the merge).
- **Review notes carried (non-blocking):** several unread handoffs show newest first, older
  after GOT IT; `noteShiftHandoff` doesn't itself enforce "work ended / one per day" (the screen
  does); a restore doesn't carry SKIP marks; `check:risk` files localStorage modules under
  persistence as OTHER.
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
  `claude/notes-sweep-001`, and `claude/notes-sweep-001-close`, `claude/notes-handoff-001`, `claude/notes-handoff-001-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
