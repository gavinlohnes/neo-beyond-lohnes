# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `90bc026` (PR #176,
NOTES-SWEEP-001 closed).

- **Drop:** `NOTES-HANDOFF-001` shift handoff: HIGH-RISK (new stored data; storage ruled 2A by
  Gavin 2026-10-04; Gavin approves the merge), `ACTIVE`. Branch `claude/notes-handoff-001`.
  **PR:** see `docs/agent/ACTIVE_DROP.md` `pr:`.
- **Done:** new events `SHIFT_HANDOFF_NOTED` {commandId, note} and `SHIFT_HANDOFF_READ`
  {commandId, handoffEventId}; `noteShiftHandoff` / `markShiftHandoffRead` in `commands.ts`
  (trim, 1–280 chars); `application/shiftHandoffQueries.ts` (prompt after WORK_PERIOD_ENDED on a
  WORK day until noted or skipped; latest unread note from an earlier day, shown only on WORK
  days); SKIP is a per-day localStorage mark (`persistence/shiftHandoffSkips.ts`), no event.
  `ui/components/ShiftHandoff.tsx` above TODAY; TodayScreen's new optional `onWorkEnded` prop
  makes the question appear at once. History copy for both events.
- **Boundary crossed:** backup contract (two new event types). Owner ruling: obtained (2A).
  Rollback: revert; saved events become inert rows History shows by raw type.
- **Compatibility verification:** `tests/compat` 30/30; `tests/integration/shiftHandoff.test.ts`
  (7: prompt timing, SKIP writes nothing, next work day only, GOT IT, own-day note not echoed,
  limits, backup → restore keeps it unread, schema version unchanged, history wording).
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 2,009 passed, 0 failed; `build` OK; `git diff --check` OK.
- **Left:** independent review; Gavin approves the merge; close. Then `NOTES-CAPSULE-001`.
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
1. NOTES-HANDOFF-001 after review: **A. Merge as is (recommended)** · B. Tune a detail first ·
   C. Hold.
