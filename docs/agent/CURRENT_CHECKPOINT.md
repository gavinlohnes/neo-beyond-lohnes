# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `c27e1f1` (PR #190,
SHORTCUTS-001 merged after independent review; closed in this branch).

- **Drop:** `VIEWS-001` data views: ROUTINE. **ACTIVE**, branch `ccr-a34b4863-xb2jzi`.
- **Done:** SHORTCUTS-001 closed (as-built entry, roadmap). VIEWS-001 built:
  - TRAIN → RECORDS: tapping a record card opens that lift's strength curve — the heaviest counted
    set in each finished session, oldest to newest, PR sessions as red-outlined squares (the RECORDS
    rule), and a words line, e.g. "100 lb (Sep 10) → 125 lb (Oct 10) over 6 sessions · 5 PR
    sessions". CLOSE returns to RECORDS.
  - Weekly: SHOW 12 WEEKS under LAST 28 DAYS opens an 84-day grid ending today (filled =
    strength, hatched = recovery, empty = none; each cell has a text label) with a count line.
  - Read only (`src/application/viewQueries.ts`); no screen gains a row. "Your usual" bands wait
    for the F1 stop (~Oct 25).
  - Screenshots: `docs/agent/screenshots/VIEWS-001/`.
- **Left:** independent review, merge on green, close. Next is STATUS-001 (Architectural: its PR
  waits for Gavin; while it waits, no other Drop can be ACTIVE — see decision 4).
- **Verification run:** `npm run verify` (196 files / 2061 tests passed, build OK); `git diff
  --check` OK; `check:risk` Routine.
- **Open risks:** a curve opens only from a record card, so a lift with no PR yet has no curve to
  open (every lift gets one after its first PR). The grid's rows are not fixed weekdays (the last
  column ends today). Android caches home-screen shortcuts until the PWA updates. "DAY n" on the
  boot screen counts BEYOND days on record. A PR set taps once like any set. With an OBLIGATION_DUE
  recommendation the commitment's name shows twice on TODAY. Agent sessions clone shallow: `git
  fetch --unshallow origin` before `factory-drop.mjs init`. Carried over: raw capacity codes in
  "How BEYOND decided" with 2+ reasons; `factory:status` needs `GITHUB_TOKEN`; merged branches
  await deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **Week Ahead placement rule** (needed before WEEKAHEAD-001 is built):
   **A (recommended)** a workout on each day off, none on work days, A/B rotation, at most 2 days
   in a row · **B** as A plus a short session the morning after a last shift · **C** a fixed 3 per
   week, days off first.
2. **+WATER shortcut:** **A (recommended, built)** opens the water quick-add; one more tap logs ·
   **B** logs 8 oz straight away, with UNDO on screen (changes the Drop 7 "never logs by itself"
   rule).
3. **What "DAY 14" counts on the boot screen:** **A (recommended, built)** BEYOND days on record ·
   **B** calendar days since the first one · **C** the day of the current work rotation.
4. **While STATUS-001 waits for your merge approval:** **A (recommended)** let me build the
   Routine Drops after it (FIND-001, MIRROR-001) first, then STATUS and REPORT · **B** keep the
   brief's order and wait.
