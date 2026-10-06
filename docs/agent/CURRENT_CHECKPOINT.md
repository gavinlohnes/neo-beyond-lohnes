# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `a6d2044` (PR #191,
VIEWS-001 merged after independent review; closed in this branch).

- **Drop:** `STATUS-001` System Status: **ARCHITECTURAL**. **ACTIVE**, branch
  `ccr-a34b4863-xb2jzi`. **Waits for Gavin to approve the merge and the thresholds.**
- **Done:** VIEWS-001 closed (as-built entry, roadmap). STATUS-001 built — Standard report:
  - **Scope / behavioral effect:** TODAY's status strip line under the headline is now the System
    Status: a text label (GREEN / AMBER / RED / NO READ) with its dot, then the facts that set it,
    e.g. "AMBER · 5h sleep, 3 hard sessions in 4 days". It replaces the capacity sentence that sat
    there ("Capacity is YELLOW because energy is low."): a check-in's reasons now ride inside the
    status ("AMBER · energy is low"). So TODAY gains no line and no row. The strip's colored edge
    follows the status (AMBER uses the existing yellow edge).
  - **The rule (proposed; Gavin signs off at merge):** RED when the check-in reads RED or the last
    main sleep is under 4 h. AMBER when the check-in reads YELLOW, the last main sleep is under 6 h,
    or 3+ finished strength sessions started in the last 4 days. GREEN otherwise, listing what it
    rests on ("GREEN · 7h sleep, check-in clear, 1 hard session in 4 days"). With neither sleep nor
    a check-in: "NO READ · log sleep or check in", never a guessed color. "Last main sleep" = the
    latest PRIMARY sleep on the active day, else on the day before.
  - **Files:** `src/application/systemStatus.ts` (pure rule + read-only query),
    `src/ui/screens/today/statusCopy.ts`, `TodayScreen.tsx` (the strip line), tests.
  - **Protected invariants:** Engine, capacity rule, recommendations, schema and events
    untouched; nothing written (an integration test checks the recommendation table is unchanged);
    the capacity reading still shows in full under "How BEYOND decided".
  - Screenshot: `docs/agent/screenshots/STATUS-001/today-status-amber.jpg`.
- **Left:** independent review; Gavin approves the merge (and the thresholds); close. While this
  PR waits, no other Drop can be ACTIVE (one-at-a-time rule) — see decision 4.
- **Verification run:** `npm run verify` (197 files / 2067 tests passed, build OK); `git diff
  --check` OK. `check:risk` vs `a6d2044` sees no Engine/domain path; the tier is Architectural by
  the contract (a new TODAY line and a new rule).
- **Open risks:** before the status has been read (a few hundred ms on open) the strip shows the
  old capacity sentence, then switches. A curve opens only from a record card (no PR yet → no
  curve). Android caches home-screen shortcuts until the PWA updates. "DAY n" on the boot screen
  counts BEYOND days on record. A PR set taps once like any set. With an OBLIGATION_DUE
  recommendation the commitment's name shows twice on TODAY. Agent sessions clone shallow: `git
  fetch --unshallow origin` before `factory-drop.mjs init`. Carried over: raw capacity codes in
  "How BEYOND decided" with 2+ reasons; `factory:status` needs `GITHUB_TOKEN`; merged branches
  await deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **System Status thresholds (STATUS-001, needed to merge):** **A (recommended, built)** RED: RED
   check-in or under 4 h sleep · AMBER: YELLOW check-in, under 6 h sleep, or 3+ strength sessions
   in 4 days · **B** the same with AMBER at under 7 h sleep · **C** tell me your numbers.
2. **While STATUS-001 waits for your approval:** **A (recommended)** build FIND-001 and MIRROR-001
   next, then REPORT-001 · **B** keep the brief's order and wait. (A needs your OK, because only
   one Drop may be active at a time.)
3. **Week Ahead placement rule** (needed before WEEKAHEAD-001 is built): **A (recommended)** a
   workout on each day off, none on work days, A/B rotation, at most 2 days in a row · **B** as A
   plus a short session the morning after a last shift · **C** a fixed 3 per week, days off first.
