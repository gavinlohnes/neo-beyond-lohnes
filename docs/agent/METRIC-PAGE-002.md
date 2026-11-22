# METRIC-PAGE-002 — weight, protein and workouts join the shared metric page

- **Authorization:** Gavin, 2026-11-18: chose the "one look" direction ("2"), then "Let's work", then "Have Codex
  build it", then handed the build to Claude Code: "Will you give it to Claude code to do". His 14 November direction:
  he loves the shared metric page and wants that look everywhere it's needed, without remaking anything BEYOND has.
  This Drop authorizes building and opening PRs. It does not authorize a merge: Gavin merges.
- **Builder:** Claude Code originally; Gavin explicitly transferred PR #584 to Codex on 2026-11-22 for current-master
  reconciliation, verification and review. Before starting, open PRs and branches were checked: no
  other builder's work on the metric page, weight, protein or workouts. Open #565 (HABIT-QUOTA-001) touches
  `BodyDashboard.tsx` in the LIFESTYLE card only; this Drop's edits there are in other hunks.
- **Lane:** Feature, with independent exact-head review, as METRIC-PAGE-001's slices were. An Engine, schema, event,
  command, backup, provider, dependency or navigation change would be Protected: stop and report instead.
- **Baseline:** master `6a359d0` (#564 CAPTURE-PARITY-002).
- **Current reconciliation baseline:** master `57290a0094d74987b6d0a05efd81b571b8732742`
  through GRAYSON sequence activation #612; active PR remains
  [#584](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/584).

## What to build, one slice per measurement, in this order

1. **Weight.** Owner-logged (white, LOGGED); Garmin weight is never imported. Ranges LATEST, 30D, 1Y (7D only if it
   reads well with sparse weigh-ins). Days without a weigh-in are gaps, never zero and never carried forward. 1Y weeks
   are the mean of weighed days. Keep everything BODY's weight trend shows (best-since, milestones, projected goal date)
   by reusing `WeightTrend` and `bodyTrendQueries`. Usual, work days against days off and the 90-day direction follow
   the existing sample floors. Corrections stay on the existing weight records route.
2. **Protein.** Owner-logged, white. Daily total per lived day; weeks as the mean of logged days, like calories. His
   protein target where one is set, as a target, never a deficit or remaining figure. Reuse `FoodSources`.
3. **Finished workouts.** Count per lived day; weeks and 1Y as weekly totals. Completed and partial sessions use
   BEYOND's established descriptive “finished workout” count. This is not the stricter qualifying-outcome rule that
   advances an active A → B → C sequence. No new goal, streak, pressure or advice.

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

- Gavin merged slice 1 as #566 (`17d0e15`). Slice 2 starts from that master.
- `getMetricDetail("protein")`: the day ledger's effective `proteinG` per lived day (meal protein plus quick protein
  logs, corrections applied, undone logs left out). TODAY is the running total from 16:30, stepping up at each meal
  or quick log (the domain's `cumulativeEaten`, fed protein grams). Weeks are the mean of logged days, like calories.
- The target is BEYOND's existing `getEffectiveProteinTargetG` (multiplier times latest weigh-in): a dashed line
  labelled "target" and one plain sentence. Never a deficit, a "remaining" or a pace judgement. No weigh-in, no target.
- 7D and 30D show FOOD-SOURCES-001's protein sources, as the calories page shows calories'.
- TODAY's PROTEIN tile opens the page. PROTEIN RECORDS goes to the route the tile used before (DATA's protein
  history, where FOOD-SOURCES-001's day links to that day's records still live); LOG PROTEIN opens the existing
  protein sheet. `FoodSources001`'s TODAY-tile test now goes through PROTEIN RECORDS.
- BODY has no protein-only panel: its NUTRITION card shows calories and protein together and keeps opening the
  calories history, because the protein page alone would drop the calories it shows.

## Slice 3 — finished workouts (Claude Code, branch `claude/metric-page-002-workouts`)

- Gavin merged slice 2 as #567 (`1f6e3d8`). Slice 3 starts from master `c54c000`, which also carries
  METRIC-CHANGE-001's "This week" line (#577). No open PR touches the metric page, BODY's progress or workouts.
- **What counts:** TRAIN's sessions that ended COMPLETED or PARTIAL, on the lived day they belong to. That is BEYOND's
  existing "finished workouts" (BODY's progress, DATA's explorer, the weekly summary), now one shared helper,
  `isFinishedWorkout`. The brief said "matching what advances the rotation", which is stricter (STANDARD advances only
  on COMPLETED, RECOVERY never); the page keeps BEYOND's existing count, as Gavin was told on 2026-11-18. Abandoned and
  active sessions never count.
- **Zero and missing:** a lived day BEYOND has a record of with no finished workout is 0 (no bar); a period with no
  BEYOND day is missing (a dashed stub), never 0.
- **Ranges:** TODAY lists this lived day's finished sessions in TRAIN's words ("WORKOUT A · Completed · 45 min").
  7D and 30D are a bar per lived day and the range's total, this lived day so far included, with how many lived days
  had one. 1Y is each week's total; its headline is the average of finished weeks to a tenth (0.3 a week). Gridlines
  stay whole numbers.
- **Usual and split:** a day's median of a count is almost always 0 or 1, so the usual is a week's: the median total of
  the last 8 finished weeks, once there are 4 (`weeklyUsual`), drawn on 1Y only. Work days against days off count the
  days of each kind that had a finished workout (`trainedSplit`), never a median. No 90-day direction line (medians of
  daily counts again); "This week so far" and last week are plain totals with no "up" or "down" (`weekTotals`).
- **No goal, streak, pace or advice.** No TODAY tile. No LOG or RECORDS buttons: sessions and their corrections live
  in TRAIN, and BODY's progress has no route there to reuse.
- **Where it opens:** DATA's progress (reached from DATA's Weight shortcut, a dashboard card's history or BODY's YOUR PROGRESS) has a TRAINING section, which gains WORKOUTS OVER TIME. The TRAINING line ("2 workouts · 1 PR")
  and DATA's Insights Explorer (which also charts finished workouts) are unchanged; nothing is removed.
- **Project Grayson reconciliation:** this is supporting descriptive evidence, not TRAIN Progress and Direction,
  programme progress, adherence, a recommendation or proof that training is working. “Finished” retains BEYOND's
  established completed-or-partial count. It is deliberately distinct from the stricter qualifying outcome that
  advances the owner-confirmed A → B → C sequence. Custom-template names, including archived templates, remain
  inspectable for today's recorded sessions; no programme or workout history is rewritten.
