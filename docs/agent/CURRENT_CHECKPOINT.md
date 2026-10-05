# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `cc28335` (PR #178).

- **Drop:** `NOTES-CAPSULE-001` time capsule: HIGH-RISK (new stored data; storage ruled 2A;
  Gavin approves the merge), `ACTIVE`. Branch `claude/notes-capsule-001`. **PR:**
  [#179](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/179).
- **Done:** events `TIME_CAPSULE_SEALED` {commandId, note, opensOn} and `TIME_CAPSULE_OPENED`
  {commandId, capsuleEventId}, not tied to a day (no beyondDayId, like Decision Journal events),
  written by `application/timeCapsuleCommands.ts` (trim, 1–500 chars, 1/3/6/12 months;
  `opensOnAfter` clamps to month end); `application/timeCapsuleQueries.ts` (waiting = dates only;
  due = on/after opensOn and unread). MORE → Direction → TIME CAPSULE (write, pick, SEAL; list of
  sealed dates); above TODAY, a due capsule shows until GOT IT. History copy never shows sealed text.
- **Boundary crossed:** backup contract (two new event types). Owner ruling: obtained (2A).
  Rollback: revert; saved events become inert rows.
- **Compatibility verification:** `tests/compat` 30/30; `tests/integration/timeCapsule.test.ts`
  (6: month math, sealed text hidden until the date, due until GOT IT, no beyondDayId, limits,
  backup → restore keeps sealed/unread state, schema version unchanged, history wording).
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 2,017 passed, 0 failed; `build` OK; `git diff --check` OK.
- **Left:** independent review; Gavin approves the merge; close. Then WALKTHROUGH-001,
  CLEANUP-002, a field-use week, and the review account (Gavin sets it up).
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
1. NOTES-CAPSULE-001 after review: **A. Merge as is (recommended)** · B. Tune a detail first ·
   C. Hold.
