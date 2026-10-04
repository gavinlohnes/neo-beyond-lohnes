# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `2951b67` (PR #172
merge, GYM-POLISH-001 closed). Gavin signed off the cue storage plan 2026-10-04 ("1. a, 2. A"):
an event, edited in the gym screen only; recorded in the roadmap, `docs/UX_DECISIONS.md` and the
Drop.

- **Drop:** `GYM-002` cue text per lift: HIGH-RISK (new stored data; Gavin approves the merge),
  `ACTIVE`. Branch `claude/gym-002`. **PR:** see `docs/agent/ACTIVE_DROP.md` `pr:`.
- **Done:** new event type `EXERCISE_CUE_SET` {commandId, exerciseId, cue} (domain union +
  `ExerciseCueSetPayload`, `EXERCISE_CUE_MAX_LENGTH` 140); `setExerciseCue` in `trainCommands.ts`
  (trims; rejects > 140; "" clears); `getExerciseCues` in `trainQueries.ts` (latest per lift by
  time then seq). Gym screen: cue under the lift's name with + ADD CUE / EDIT, SAVE / CANCEL.
  History: "Cue set: Leg Press." / "Cue cleared: Leg Press."; not counted in the Day Ledger. **No
  `db.version` change, no new table.**
- **Boundary crossed:** backup contract (new event type rides in native backups). Owner ruling:
  obtained (2A storage; "1. a" event). Rollback: revert the PR; existing `EXERCISE_CUE_SET` events
  would then be inert rows that History shows by their raw type name, nothing else reads them.
- **Compatibility verification:** `tests/compat` 30/30 (protected fixtures, legacy restore);
  `tests/integration/exerciseCues.test.ts` round trip (cue survives backup → later changes →
  restore), schema version unchanged, > 140 writes nothing.
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 1,994 passed, 0 failed; `build` OK; `git diff --check` OK;
  `check:risk` flags the domain type (expected).
- **Left:** independent review (back-compat and round trip); Gavin approves the merge; close.
  After that the Queue is empty.
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
1. GYM-002 after review: **A. Merge as is (recommended)** · B. Tune a detail first · C. Hold.
