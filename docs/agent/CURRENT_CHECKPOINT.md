# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `c84e391` (PR #186,
the ten Advanced-batch Drops).

- **Drop:** `ADVISORY-002` Advisory cleanup: ROUTINE. **ACTIVE**, branch `ccr-a34b4863-xb2jzi`,
  PR opened from it.
- **Done:** ADVISORY groups same-kind notes into one row each ("Easing back in · 8 lifts"); a tap
  (SHOW) lists each lift with its plain WHY; three rows max, the rest fold into "More · n notes";
  PROTECT keeps its message and quick actions on the row. Obligation notes left ADVISORY: the
  COMMITMENT card now lists every other due one ("Also: Blood work · Overdue — was due …").
  TODAY titles OBLIGATION_DUE with the real commitment ("Blood work · Overdue"); the Engine's
  own title "An obligation needs attention" is unchanged and no longer shown; History labels it
  "A commitment was due". The "Background context…" explainer is gone.
  Screenshots: `docs/agent/screenshots/ADVISORY-002/` (TODAY, ADVISORY open, COMMITMENT open).
- **Left:** independent review, merge on green, close. Then FEEL-001 (Queue order). WEEKAHEAD-001
  needs Gavin's placement rule; STATUS-001 and REPORT-001 wait for Gavin to approve their merges.
- **Verification run:** `npm run verify` (architecture OK, 189 files / 2035 tests passed, build
  OK); `git diff --check` OK; `check:risk` vs `c84e391`: Routine (UI + tests only).
- **Open risks:** with an OBLIGATION_DUE recommendation, the commitment's name now appears twice on
  TODAY (the recommendation title and the COMMITMENT row); before, the title said nothing. The
  clone in agent sessions is shallow: run `git fetch --unshallow origin` before
  `factory-drop.mjs init`, or old merged branches read as ACTIVE conflicts. Carried over: raw
  capacity codes in "How BEYOND decided" with 2+ reasons; `factory:status` needs `GITHUB_TOKEN`;
  80+ merged branches await deletion by Gavin.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **Week Ahead placement rule** (needed before WEEKAHEAD-001 is built):
   **A (recommended)** a workout on each day off, none on work days, A/B rotation, at most 2 days
   in a row · **B** as A plus a short session the morning after a last shift · **C** a fixed 3 per
   week, days off first.
