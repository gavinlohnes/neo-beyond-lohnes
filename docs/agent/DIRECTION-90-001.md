# DIRECTION-90-001 — the last 90 days against your year, in one line

- **Authorization:** Gavin, 2026-11-14, approving "a 90-day direction line on each metric page: one plain sentence
  comparing your last 90 days with the year before … only once there are about 180 days of data; never a score, arrow
  or judgement": "Approved".
- **Builder:** Claude Code. Branch `ccr-88f5c085-metric-direction`, built on #530 (METRIC-PAGE-001 slice 4, calories)
  because it needs the calories page. Feature lane: no independent review required; Gavin merges.
- **Origin:** [HARVEST-001](harvest/HARVEST-001.md) backlog #7 (Apple Health's Trends idea: ideas only, no code).

## What Gavin sees

On the shared metric page (hydration, steps, resting heart rate, calories), above the actions, in every range:

> Last 90 days: 8,450 steps a day, higher than your year's 7,900. Medians of measured days.

Calories gets one sentence with both series: "Last 90 days: eaten 2,100 kcal a day, about the same as your year's
2,150; burned 2,500 kcal a day, higher than your year's 2,400. Medians of recorded days."

## Rules (pure, `direction90` in `application/metricDetail.ts`)

- The median of the recorded days in the last 90 finished lived days, against the median of the last 365. Today is
  left out. Missing days are skipped, never zero.
- **Quiet until there's enough:** the records must reach back 180 days, with at least 30 recorded in the last 90 days
  and 90 in the year. Before that the page shows nothing about direction.
- **About the same** when the difference is under 5% of the year's value or under the metric's floor (1 oz, 100 steps,
  1 bpm, 25 kcal).
- Words are only "higher", "lower" and "about the same as". No better or worse, score, arrow, colour or urgency.
- Read only. No Engine input, no new data, schema or dependency.

## Excluded

Sleep's own page (it has its own D/W/M/Y navigation; a later slice if wanted); BODY or TODAY tiles; any alert.

## Leverage gate

- **REUSE:** the shared metric page and its series, `median` from `domain/health/baselines.ts`.
- **OWN:** the 90-day/year comparison and its sentence.
- **BUILD FROM SCRATCH:** none.
