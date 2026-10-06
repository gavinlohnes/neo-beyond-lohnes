# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `e7441dc`.

- **Drop:** none active. This session wrote the ten Drops of Gavin's "Advanced batch" brief
  (2026-10-05): `ADVISORY-002`, `FEEL-001`, `BOOT-001`, `SHORTCUTS-001`, `VIEWS-001`,
  `STATUS-001`, `FIND-001`, `REPORT-001`, `MIRROR-001`, `WEEKAHEAD-001`, in
  `docs/agent/drops/`, each with `baseline: SET-AT-ACTIVATION` (set to fresh `origin/master` when
  the Drop is activated). Branch `ccr-a34b4863-xb2jzi`.
- **Done:** Drops written; Gavin's rulings recorded the same day (roadmap Queue, `UX_DECISIONS.md`,
  doctrine amendment: the app icon may appear on the icon and the boot screen only).
- **Left:** build in Queue order, starting with ADVISORY-002. WEEKAHEAD-001 is not buildable until
  Gavin signs off a placement rule. STATUS-001 and REPORT-001 wait for Gavin to approve the merge
  (and their thresholds / call list).
- **Verification run:** docs only; `git diff --check` OK.
- **Open risks:** carried over from the last handoff: "How BEYOND decided" shows raw capacity
  codes on a day with two or more reasons; the planned-work question can flash on TRAIN after a
  finished workout; `factory:status` needs `GITHUB_TOKEN`; 80+ merged branches await deletion by
  Gavin (listed in git history of this file, 2026-10-04).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **Week Ahead placement rule** (needed before WEEKAHEAD-001 is built):
   **A (recommended)** a workout on each day off, none on work days, A/B rotation, at most 2 days
   in a row · **B** as A plus a short session the morning after a last shift · **C** a fixed 3 per
   week, days off first.
