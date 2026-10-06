# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `e8c391d` (PR #193,
FIND-001 merged after independent review; closed in this branch).

- **Drop:** `MIRROR-001` the Mirror: ROUTINE. **ACTIVE**, branch `ccr-a34b4863-xb2jzi`.
- **Done:** FIND-001 closed (as-built entry, roadmap). MIRROR-001 built: Weekly has a MIRROR row,
  closed by default (SHOW MIRROR). It compares NOW / 30 DAYS AGO / 90 DAYS AGO:
  - Weight: the average of weigh-ins in the 7 days ending then.
  - The 3 lifts with the most finished sessions: the heaviest counted set on record by then
    (substituted, skipped and undone sets left out, as RECORDS counts them).
  - Sleep: the average main sleep over BEYOND days that began in the 7 days ending then.
  - Clean days: days logged clean in the 30 days ending then (only once the quit tracker existed).
  - Any value with nothing behind it reads "not enough data yet"; nothing is estimated. Read only
    (`src/application/mirrorQueries.ts`).
  - Screenshot: `docs/agent/screenshots/MIRROR-001/weekly-mirror.jpg`.
- **Left:** independent review, merge on green, close. Then REPORT-001 (Architectural: its PR waits
  for Gavin), then WEEKAHEAD-001 (Architectural; rule A signed off).
- **Verification run:** `npm run verify` (201 files / 2081 tests passed, build OK); `git diff
  --check` OK.
- **Open risks:** the Mirror reads at the same time of day as now (e.g. "30 days ago" = that date at
  this hour), so a weigh-in later that day isn't counted. On a narrow phone the three columns wrap
  "not enough data yet" over two lines. Carried over: a LIFT/PR search result during an active
  workout opens TRAIN on the workout; TODAY's strip briefly shows the old capacity sentence before
  the System Status reads; a curve opens only from a record card; Android caches home-screen
  shortcuts until the PWA updates; with an OBLIGATION_DUE recommendation the commitment's name
  shows twice on TODAY; agent sessions clone shallow (`git fetch --unshallow origin` before
  `factory-drop.mjs init`); raw capacity codes in "How BEYOND decided" with 2+ reasons;
  `factory:status` needs `GITHUB_TOKEN`; merged branches await deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
