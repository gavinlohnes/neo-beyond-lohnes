# METRIC-PAGE-001 — hydration and steps pilot

- **Authorization:** Gavin, 2026-11-14: “Build and validate a reusable metric-detail foundation using Hydration and Steps” (preserved in the recovered implementation and accepted HARVEST-001). Owner explicitly authorized Codex takeover, then confirmed continuing this pilot after merging foundation PRs #517 and #518: “Go ahead.”
- **Lane:** Feature, with independent review of provenance, ranges and preserved routes. This is read-side inspection, not a recommendation or primary-tab IA change.
- **Builder:** Claude Code (recovered implementation), Codex (completion). Existing branch `ccr-88f5c085-metric-pilot`; active [PR #519](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/519).
- **Baseline:** recovered committed pilot `e63a6659a3b3097b39482f9cfa4d38db15371eff`, based on `e12092871d0cee4a1b551f428a013de1332ae833`. Completion integrates freshly fetched master `8e04e2eb5f486c83489777446370860e3ac57595`, with both foundation prerequisites merged.

## Bounded experience

TODAY's WATER/STEPS and DATA's hydration/steps panels open the same reusable metric detail. TODAY, 7D, 30D and 1Y retain lived-day boundaries, missing values, source and corrections. The 7/30-day charts include the current lived day marked “so far”; averages and coverage count only finished days. The yearly chart groups 52 weeks: hydration is the mean of logged days per week; steps is measured weekly total. The hydration yearly headline averages recorded finished days, not averages of differently populated weeks. Partial current weeks are identified. Missing days never become zero or disappear from coverage.

Water remains owner logs in white, with hourly bars, LOG WATER and WATER RECORDS (canonical correction route). Steps remain Garmin blue, with running totals, sync/freshness and existing usual/unusual readings. Show sample floors for usual and work/off comparisons; no invented goal or advice. Preserve empty, failure/retry and keyboard-return paths. All browsing is read-only. Alfred remains optional and operator-confirmed.

The pilot amends only hydration/steps inspection routes; other measurements keep existing detail views. It preserves the emblem, skyline, foundation identity, user workflows and architecture. No Engine, schema/migration, command semantics, backup, runtime dependency/provider, primary screen composition or other metric expansion.

## Reuse disposition

- **REUSE:** foundation SourceTag/tokens; LogSheet modal/focus; day ledger effective hydration; canonical water commands/records; measured snapshot/lived periods/weekly aggregation; Garmin freshness, sync and usual/unusual presentation; existing Alfred entry; synthetic lived-month fixture. Accepted CHP-001/HARVEST-001 research is preserved and indexed, not repeated.
- **OWN:** composing those readings into the bounded detail page, water history aggregation and work/off display; route adapters.
- **BUILD FROM SCRATCH:** none beyond that BEYOND-specific composition. No donor code/assets or dependency added.

## Acceptance

Meaningful tests of missing/zero distinctions, corrected/voided hydration, yearly weighting, current-period exclusion, work-context/sample floors and lived-day boundaries; real Chromium from 320 to 1024 px, accessible ranges/chart/table, sources/freshness, logging/correction/back routes, error/retry and no-write browsing. Run architecture, typecheck, production/PWA build, full Node suite and browser regression verification. Persist actual results and any limitations in the checkpoint/PR; never merge.

## Slice 2 — resting heart rate (Gavin, 2026-11-14: "Approved and continue working")

- **Authorization:** after #519 merged, Gavin approved extending the metric page to sleep and resting heart rate.
- **Builder:** Claude Code. **Branch:** `ccr-88f5c085-metric-sleep-rhr`, from master `c9d6702d`.

**Resting heart rate moves onto the shared page.** TODAY's RESTING HR tile and DATA's resting panel open it in place of
GARMIN-004's `MeasuredSheet`, and the new page shows everything that sheet did:
- **LATEST:** the newest reading, from this lived day or the one before. Garmin publishes resting heart rate once a
  day, and the page says so. There's no hourly picture, because there are no hours to show.
- **7D and 30D:** a bar per lived day, Garmin blue, with gaps shown as gaps.
- **1Y:** weeks as the average of measured days. The headline weighs each measured day equally, as hydration's does.
- **Unchanged from the old sheet:** the usual median (GARMIN-004's baseline), the unusual-run note (ROTATION-002),
  Garmin freshness and sync, and Alfred.
- **Added:** work days compared with days off.
- **What happens to the old sheet:** DATA no longer opens `MeasuredSheet`. TODAY keeps it only for calories.

**Sleep keeps its own page, deliberately.** `SleepPeriods` (shared by TODAY's sheet and the cave's VITALS) already does
more than the shared page:
- it moves between earlier and later D, W, M and Y periods;
- it shows the evidence for each night;
- it has the sleep-rhythm view;
- it lets your logged main sleep win over Garmin's night by night.

Replacing it would remove capability, and the directive says not to force different metrics into identical chart
behaviour. **Next slice [R]:** give the sleep page the shell's source line and the work days compared with days off,
inside `SleepPeriods`, without changing its chart.

**Verification:**
- **Unit and query tests:** resting's ranges and weekly meaning; the newest-reading rule; series equal to the Garmin
  snapshot; no writes.
- **Browser (MetricPage001):**
  - resting opens from TODAY and from DATA;
  - LATEST is first, with no chart, and 30D is in Garmin blue;
  - 1Y reads "bpm a measured day";
  - usual and Alfred are present;
  - the layout and size sweep and axe pass for all three pages, from 320 to 1024 px.
- **Updated:** Garmin004's resting test for the shared page. UnusualForYou passes unchanged.

