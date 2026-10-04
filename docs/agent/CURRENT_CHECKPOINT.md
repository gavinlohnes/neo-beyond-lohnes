# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `66a87d0` (PR #158 merge).

- **Drop:** none active. Queue (all Drops written, all buildable now):
  1. `HUD-001` HUD design system — ARCHITECTURAL (doctrine amendment approved, 1A).
  2. `BACKUP-AUTO-001` automatic backup — ARCHITECTURAL (due-on-open + share, no account, 2A).
  3. `PR-CARDS-001` PR record cards — ROUTINE.
  4. `BODY-TIMELINE-001` transformation timeline — ROUTINE.
- **Codex: start with Queue item 1, `HUD-001`.** Set the Drop's `baseline:` to fresh
  `git rev-parse origin/master`, `factory-drop.mjs init`, build, verify, PR titled
  `[NEEDS CLAUDE REVIEW] HUD-001: …`, handoff note, stop. Never merge. Architectural Drops wait
  for Gavin to merge; Routine ones merge on green after Claude's review.
- **Branch:** `ccr-22d7c0f8-rqhhjm` carries only these decision records.
- **Field issues:** none open.
- **Verification run:** docs only; `factory-drop.mjs validate PR-CARDS-001` passes against
  current master once the baseline is updated.
- **Open risks / traps:** `npm run factory:status` needs a `GITHUB_TOKEN` (fails with
  `GITHUB_API_401` in cloud sessions). Gavin is deleting the 56 merged branches on GitHub
  (decision 3A); afterwards remove their entries from `docs/agent/RETIRED_BRANCHES.json`.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
