# METRIC-PAGE-002 — weight, protein and workouts join the shared metric page

- **Authorization:** Gavin, 2026-11-18: chose the "one look" direction ("2"), then "Let's work", then "Have Codex
  build it", then handed the build to Claude Code: "Will you give it to Claude code to do". His 14 November direction:
  he loves the shared metric page and wants that look everywhere it's needed, without remaking anything BEYOND has.
  This Drop authorizes building and opening PRs. It does not authorize a merge: Gavin merges.
- **Builder:** Claude Code, one builder for the whole Drop. Before starting, open PRs and branches were checked: no
  other builder's work on the metric page, weight, protein or workouts. Open #565 (HABIT-QUOTA-001) touches
  `BodyDashboard.tsx` in the LIFESTYLE card only; this Drop's edits there are in other hunks.
- **Lane:** Feature, with independent exact-head review, as METRIC-PAGE-001's slices were. An Engine, schema, event,
  command, backup, provider, dependency or navigation change would be Protected: stop and report instead.
- **Baseline:** master `6a359d0` (#564 CAPTURE-PARITY-002).

## What to build, one slice per measurement, in this order

1. **Weight.** Owner-logged (white, LOGGED); Garmin weight is never imported. Ranges LATEST, 30D, 1Y (7D only if it
   reads well with sparse weigh-ins). Days without a weigh-in are gaps, never zero and never carried forward. 1Y weeks
   are the mean of weighed days. Keep everything BODY's weight trend shows (best-since, milestones, projected goal date)
   by reusing `WeightTrend` and `bodyTrendQueries`. Usual, work days against days off and the 90-day direction follow
   the existing sample floors. Corrections stay on the existing weight records route.
2. **Protein.** Owner-logged, white. Daily total per lived day; weeks as the mean of logged days, like calories. His
   protein target where one is set, as a target, never a deficit or remaining figure. Reuse `FoodSources`.
3. **Finished workouts.** Count per lived day; weeks and 1Y as weekly totals. Only finished workouts count, matching
   what advances the rotation. No new goal, streak, pressure or advice.

**Where each opens from:** TODAY's PROTEIN and WEIGHT tiles and BODY's matching panels. Switch a tap only when the new
page shows everything the old view did; otherwise keep the old route and say so in the PR. Workouts open from wherever
BODY already shows finished workouts over time; no new TODAY tile.

## Must not change

Nothing is removed (Insights Explorer, the BODY dashboard, the cave's VITALS and the weekly views stay; retiring one is
a later owner decision, one view at a time). Sleep keeps its own page. Lived days run 16:30 to 16:30; missing is never
zero; estimates say so; sources are labelled. Eaten and burned are never netted. 16 px sentences and controls, 44 px
targets, tested contrast, one filled red action per screen, no spill from 320 to 1024 px. Browsing writes nothing. No
Engine, schema, migration, event, command, backup, provider or dependency change; the UI reads through application
queries only.

## Reuse disposition

- **REUSE:** the shared metric page and its helpers (`dailySeries`, `rangeValues`, `usualOf`, `workOffSplit`,
  `direction90`), `FoodSources`, `WeightTrend` and the weight trend functions, the body insights queries, the existing
  record and correction routes.
- **OWN:** adding the three measurements to the page and their route adapters.
- **BUILD FROM SCRATCH:** none.

## Slice 1 — weight (Claude Code, branch `claude/metric-page-002-weight`)

- `getMetricDetail("weight")`: each lived day's last weigh-in by its BEYOND day, from
  `getBodyweightHistoryWithSources` (corrections applied, undone weigh-ins left out). LATEST is the newest weigh-in plus
  the same history and goal weight BODY's `WeightTrend` uses, so best-since, milestone and goal date are BODY's own.
- No 7D: a week of sparse weigh-ins reads as mostly gaps. 30D and 1Y draw dots on an axis fitted to the weights
  (bars from zero would flatten every change), one tenth of a pound kept in averages (`DIGITS`, an optional `digits`
  on `rangeValues`/`summarise`, defaulting to whole numbers so other metrics are unchanged; the domain's `weekly` is
  untouched).
- The 90-day direction uses a one-pound floor and no 5% share for weight (5% of a body weight is several pounds).
- TODAY's WEIGHT tile and BODY's WEIGHT card open the page. WEIGHT RECORDS goes to the route each tap used before
  (TODAY: DATA's weight evidence; BODY: its weight history), LOG WEIGHT to the existing weight sheet, so nothing the old
  views showed is lost.

## Slice 2 — protein (Claude Code, branch `claude/metric-page-002-protein`)

- Baseline master `17d0e15` (#566, slice 1, merged). Lane Feature; read side only.
- `getMetricDetail("protein")`: each lived day's `proteinG` from the day ledger (meals plus protein-only logs, corrections
  applied, deleted logs left out): the same total TODAY's tile and BODY's NUTRITION card show. A day with nothing logged
  is missing, never zero. TODAY is a running total that steps up at each of the lived day's logs (`getFoodDiary`).
- Ranges TODAY, 7D, 30D, 1Y; weeks are the mean of logged days, like calories; whole grams. 90-day direction floor 5 g
  plus the usual 5% share.
- The target is `getEffectiveProteinTargetG` (grams per pound × latest weigh-in), drawn as a quiet solid line labelled
  "target" and one sentence ("Your protein target: N g a day"). No remaining, deficit or pace figure. With no weigh-in
  it says no target yet, never a guessed one.
- WHERE IT CAME FROM (`FoodSources nutrient="protein"`) on 7D and 30D, as on calories.
- TODAY's PROTEIN tile opens the page. PROTEIN RECORDS goes where the tile went before (BODY's protein history, which
  has its own sources and day links), LOG PROTEIN to the existing protein sheet. `FoodSources001`'s BODY protein test
  now reaches that history through PROTEIN RECORDS.
- **BODY keeps its route:** BODY has no protein-only panel; its NUTRITION card shows calories and protein together and
  opens the calories history. Switching it to the protein page would hide calories, so it stays as it is.
