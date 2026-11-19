# ENERGY-CURVE-001 — TONIGHT'S ENERGY on TODAY

- **Authorization:** Gavin, 2026-11-19. HARVEST-003 (PR #579) proposed "BEYOND runs your night". To decision 2 ("grant
  the Protected approvals up front"), Gavin answered "All are approved", which covers a new TODAY panel (part 1). He
  didn't answer decisions 1 (order) and 3 (pace), so the plan's order is used: one part at a time.
- **Lane:** PROTECTED (TODAY layout). Independent exact-head review, green CI, and **Gavin merges**. No Engine, schema,
  event, command, backup, provider, dependency or alert change.
- **Origin:** Rise's energy schedule and Timeshifter's shift-work fatigue warning (HARVEST-003). These are ideas only:
  no code, assets or identity are reused.

## What it does

A wide foundation panel on TODAY, just above AT A GLANCE: **TONIGHT'S ENERGY · ESTIMATE**.

- **The line:** one line across the lived day (16:30 to 16:30), higher meaning sharper.
  - Shading marks the shift, and then sleep. The line breaks while you sleep.
  - A red mark shows now. A dashed mark shows the caffeine cut-off (from the shift sleep plan).
- **Sentences** (16 px) carry the same facts:
  - "Lowest stretch 03:30–06:45."
  - When the hour after the shift ends falls in that stretch: "Extra care on the drive home, 06:00–07:00: it falls in
    your lowest stretch."
  - The caffeine cut-off and nap window.
- **"How this is worked out"** names the inputs, the model and its sources, and says: "Not a measurement or a score."
- **Quiet** until there are 3 Garmin main sleeps in the last week ("0 so far").

## The model (`application/alertness.ts`, pure)

The two-process model of sleep regulation (Borbély; Daan, Beersma & Borbély 1984):
- **Sleep pressure S** rises while awake (τ 18.2 h) and falls while asleep (τ 4.2 h).
- **A 24-hour circadian rhythm C** has its low 1.5 h before your habitual wake. That is the median wake of your
  recent main sleeps, across midnight.
- **Alertness** is C − S, scaled to the day's own range.
- **Inputs:**
  - Sleep pressure runs from 3 days of your Garmin sleep, naps included.
  - Tonight's sleep is the shift plan's window, or, when it has none, your usual sleep from your recent nights.
- **The lowest stretch** is the longest waking run in the lowest third.

Every constant is cited in `SOURCES`, search-confirmed 2026-11-19. It never feeds the Engine and never changes advice.

## Reuse

- **REUSE:** the shift sleep plan (shift, caffeine cut-off, nap and sleep windows), Garmin sleep history, the lived-day
  boundary, and the foundation `Panel` and `SourceTag`.
- **OWN:** the two-process estimate and its panel.
- **BUILD FROM SCRATCH:** the estimate itself. No maintained library fits a browser, offline, cited and auditable
  in ~60 lines.

## Verification

- `tests/alertness.test.ts` (Node, UTC and America/Chicago):
  - habitual wake, across midnight;
  - the low at the end of the night shift, and the drive flag;
  - waking in the evening reads higher than 05:00;
  - quiet below 3 nights;
  - usual sleep and the next usual sleep.
- `tests/browser/EnergyCurve001.test.tsx`:
  - the panel draws from the seeded month's Garmin sleep and names the lowest stretch;
  - it's labelled an estimate, with no percentages or scores;
  - nothing is written;
  - no spill and 16 px sentences at 320, 412 and 1024 px;
  - axe passes;
  - the empty state.
- TODAY's suites pass: TodayScreen, RedesignToday, CommandConsole, App, TodayBriefingPreview, accessibility,
  Walkthrough002, TodayRun, VisualFoundation003 and Density001 (174 tests with EnergyCurve001).

## Not yet (later parts of the plan)

- Training load feeding the curve (part 5).
- Alerts for the cut-off or the drive (part 5).
- The light windows from Timeshifter.

## Builder recovery — 2026-11-19

Codex continues Claude’s existing PR #580 at Gavin’s takeover request, starting at `de11361e`. CI’s two failed shards both identify heading-order violations on `today-energy-title`. The repair adds an optional h2 level to the existing Panel primitive, retaining h3 for other callers, and selects h2 for this standalone TODAY section. The focused browser test asserts its semantic heading. No estimate formula or product scope changes. Final verification and independent review belong to the exact repaired head in the PR handoff.

Independent review on the heading-repair head blocked on two query defects. The follow-up reuses `nextRolloverBoundaryAfter` for calendar/DST-safe endpoints and anchors assumed sleep to the lived day rather than the moving clock. Overlapping actual records replace an assumption, including shorter actual sleep. The explanation explicitly distinguishes unrecorded assumed sleep from confirmed records. New query tests cover before/during/after delayed sleep imports, an underway plan, replacement by actual evidence and both DST transition dates; 11 focused tests pass in UTC and America/Chicago. Renew review on the follow-up head.
