# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `c83114f` (PR #194,
MIRROR-001 merged after independent review; closed in this branch).

- **Drop:** `REPORT-001` Briefing / After Action Report: **ARCHITECTURAL**. **ACTIVE**, branch
  `ccr-a34b4863-xb2jzi`. **Waits for Gavin to approve the merge and the call list.**
- **Done:** MIRROR-001 closed (as-built entry, roadmap). REPORT-001 built — Standard report:
  - **Scope / behavioral effect:** one report, two timings. TODAY shows one line in its banner
    slot (with the backup line; no phase row): "BRIEFING READY" on a work night 0200–0459 (last
    night a scheduled shift), "AFTER ACTION READY" from 0600 on the first day off after a work
    block. Neither shows if last night was declared OFF. OPEN shows the report in place; after
    that the line steps back for the day (remembered on the phone only). Weekly has a closed
    REPORT row that opens it any time.
  - **The report (five items at most, each left out when empty):** (1) this block vs last —
    sessions, sets, average main sleep, e.g. "This block (Mon, Oct 12 – Tue, Oct 13, 2 shifts): 2
    sessions, 2 sets, avg sleep 5h"; (2) what moved — PRs set in the block; (3) what stalled — a
    lift trained this block with no PR in 21+ days ("Leg Press: no PR since Tue, Sep 1"); (4)
    what's coming — the next block's dates, a time capsule opening within 14 days (its date only);
    (5) ONE call, from a fixed ordered list: a stalled lift → "Consider a lighter week on X.", else
    a block averaging under 6 h sleep → "Consider protecting sleep before the next block.", else
    none.
  - **Definitions:** a block is a run of consecutive scheduled work days (the saved schedule); its
    period is the lived days that hold its shifts (16:30 the day before its first shift to 16:30
    after its last). Deterministic for the same data and time (tested); read only.
  - **Files:** `src/application/reportQueries.ts`, `src/ui/screens/report/` (copy + view),
    `src/ui/components/ReportReadyLine.tsx`, App banner slot, Weekly row, tests.
  - **Protected invariants:** Engine, recommendations, schema and events untouched; nothing
    written (tested); the line is a banner, not a phase row.
  - Also: the Mirror now leaves 0 lb sets out of its top lifts (MIRROR-001 review note).
  - Screenshots: `docs/agent/screenshots/REPORT-001/`.
- **Left:** independent review; Gavin approves the merge (and the call list); close. Then
  WEEKAHEAD-001 (Architectural; rule A signed off).
- **Verification run:** `npm run verify` (203 files / 2091 tests passed, build OK); `git diff
  --check` OK. `check:risk` sees no Engine/domain path; the tier is Architectural by the contract.
- **Open risks:** blocks come from the saved schedule, not from days actually worked, so a swapped
  shift isn't seen. The opened-today marker lives in this phone's storage only. In the browser
  test runner, unmounting and re-rendering within one test leaves later renders uncommitted
  (tests are written one render each; seen in BOOT-001 too). Carried over: the Mirror reads at the
  same time of day as now; TODAY's strip briefly shows the old capacity sentence before the System
  Status reads; a curve opens only from a record card; Android caches home-screen shortcuts until
  the PWA updates; with an OBLIGATION_DUE recommendation the commitment's name shows twice on
  TODAY; agent sessions clone shallow (`git fetch --unshallow origin` before `factory-drop.mjs
  init`); raw capacity codes in "How BEYOND decided" with 2+ reasons; `factory:status` needs
  `GITHUB_TOKEN`; merged branches await deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **The report's one call (REPORT-001, needed to merge):** **A (recommended, built)** a stalled
   lift (no PR in 21+ days) → "Consider a lighter week on X", else a block averaging under 6 h
   sleep → "Consider protecting sleep before the next block", else no call · **B** the same with
   "stalled" at 28 days · **C** tell me the calls you want.
