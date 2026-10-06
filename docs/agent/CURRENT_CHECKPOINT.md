# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Codex (backup builder/integrator under direct temporary owner
authorization).** REPORT-001 is merged and closed.

- **Drop:** `REPORT-001` Briefing / After Action Report: **ARCHITECTURAL**. **CLOSED**. PR
  [#195](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/195) merged as
  `5edbbe3d54ed653e3d14520fb41ad8188c2fbd7f`; final head
  `558a6c0ccf6208c0986255523871608b3b8889ec`.
- **Owner rulings:** Gavin approved call-list Option A on 2026-10-06. While Claude was unavailable,
  Gavin directly authorized Codex to review and merge. The temporary exception is recorded on PR
  #195; permanent governance remains unchanged pending owner/Claude follow-up.
- **Done:** MIRROR-001 closed (as-built entry, roadmap). REPORT-001 built — Standard report:
  - **Scope / behavioral effect:** one report, two timings. TODAY shows one line in its banner
    slot (with the backup line; no phase row): "BRIEFING READY" on a work night 0200–0459 (last
    night a scheduled shift), "AFTER ACTION READY" from 0600 on the first day off after a work
    block. Neither shows if last night was declared OFF. OPEN shows the report in place; after
    that the line steps back for the day (remembered on the phone only). Weekly has a closed
    REPORT row that opens it any time.
  - **The report (five items at most, each left out when empty):** (1) this block vs last —
    sessions, sets, average main sleep, e.g. "This block (Mon, Oct 12 – Tue, Oct 13, 2 shifts): 2
    sessions, 2 sets, avg sleep 5h"; (2) what moved — PRs set in the block, and clean-day and
    weight milestones reached in it ("7 clean days"); (3) what stalled — a lift trained this block
    whose heaviest set hasn't risen in 21+ days ("Leg Press: heaviest set unchanged since Tue, Sep
    1"; 0 lb bodyweight lifts and rep-only records aside); (4)
    what's coming — the next block's dates, a time capsule opening within 14 days (its date only);
    (5) ONE call, from a fixed ordered list: a stalled lift → "Consider a lighter week on X.", else
    a block averaging under 6 h sleep → "Consider protecting sleep before the next block.", else
    none.
  - **Review fixes:** mid-block (a work night) the block now runs on to its true end, so "next
    block" is the one after it (it used to call tomorrow's shift the next block); the TODAY line
    re-checks every minute, so a screen left open across 0200 still offers it; tests now prove the
    line steps back after opening and disappears out of its window. After exact-head technical
    review, Codex added explicit coverage for Option A's final no-call branch and 320/360 px
    overflow, 44 px control-height, and 16 px report-text contracts.
  - **Definitions:** a block is a run of consecutive scheduled work days (the saved schedule); its
    period is the lived days that hold its shifts (16:30 the day before its first shift to 16:30
    after its last). Deterministic for the same data and time (tested); read only.
  - **Files:** `src/application/reportQueries.ts`, `src/ui/screens/report/` (copy + view),
    `src/ui/components/ReportReadyLine.tsx`, App banner slot, Weekly row, tests.
  - **Protected invariants:** Engine, recommendations, schema and events untouched; nothing
    written (tested); the line is a banner, not a phase row.
  - Also: the Mirror now leaves 0 lb sets out of its top lifts (MIRROR-001 review note).
  - Screenshots: `docs/agent/screenshots/REPORT-001/`.
- **Left:** no REPORT-001 implementation work. Confirm this closure on `origin/master`, then read
  the Queue and written contract before activating the next Drop. Do not fold the separately
  authorized Visual Command Center campaign into another Drop.
- **Verification run:** Builder's full `npm run verify` passed (203 files / 2094 tests, build OK).
  Codex takeover verification after the review-test fixes: REPORT-001 node suite 8/8; browser suite
  7/7; `npm run check:architecture`; `npm run typecheck`; `git diff --check` — all passed.
  A full rerun reached 2094 passing tests but three unrelated Factory fixture setup hooks timed out
  under the long Windows run; the isolated Factory suite then passed 39/39. Production build and
  `check:risk -- c83114f` passed; risk sees no Engine/domain path, while the contract remains
  Architectural.
- **Open risks:** blocks come from the saved schedule, not from days actually worked, so a swapped
  shift isn't seen. AFTER ACTION READY shows from 0600 to midnight on the first day off; a night
  declared OFF hides the line only for that lived day. The opened-today marker lives in this phone's storage only. In the browser
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
None.
