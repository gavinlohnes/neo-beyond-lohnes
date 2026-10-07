# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-07 by Codex (backup builder).** WEEKAHEAD-001 is implemented and open for
review as PR #196. It is not merged.

- **Drop:** `WEEKAHEAD-001` — Week Ahead. **ARCHITECTURAL**, ACTIVE on
  `codex/weekahead-001`; baseline `ebdfe9e3f37ae560f3745d48d8e97bba7959d856`; PR
  `https://github.com/gavinlohnes/neo-beyond-lohnes/pull/196`.
- **Owner ruling:** Gavin chose Option A on 2026-10-07: preserve BEYOND's locked A → B → C
  workout rotation. Codex cannot edit the locked Decision Register, so this is flagged in the PR
  for owner/Claude follow-up.
- **Built this session:** Weekly now has a closed-by-default `WEEK AHEAD` disclosure showing today
  plus six days as scheduled shift/OFF. Read-only workout suggestions appear only on days off,
  advance through A → B → C, and stop at two consecutive days; the third is rest before suggestions
  resume. Copy says suggestions may be moved or skipped. Tests cover seven-day shape, rotation,
  cap, determinism, no writes, 320/360 px overflow, 44 px controls and neutral copy. Screenshot:
  `docs/agent/screenshots/WEEKAHEAD-001/week-ahead.jpg`.
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
- **Left:** obtain exact-head CI and technical review evidence. Because this is an Architectural
  Drop, do not merge until Gavin explicitly approves PR #196 after review. Do not fold Visual
  Command Center or unrelated advisory work into this Drop.
- **Verification run:** focused WEEKAHEAD integration 2/2 and Chromium browser 2/2;
  `check:architecture`, typecheck, production build, risk classification and diff check passed.
  The first exact-head CI run exposed an existing date-sensitive `Advisory002.test.tsx`: its
  unfrozen current date produced an unrelated advisory. Gavin authorized continuing; the test now
  freezes its clock with no product-code change. It passes alone and alongside the WEEKAHEAD browser
  suite (3/3); focused integration remains 2/2 and typecheck/diff check pass. Four Factory setup
  hooks that timed out only under a local full parallel Windows run passed 39/39 alone.
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

None before review. After review and green exact-head CI, explicitly approve or reject merging PR
#196; Architectural Drops never merge from silence.
