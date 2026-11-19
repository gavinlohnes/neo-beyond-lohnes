# METRIC-CHANGE-001 — "This week" on the metric pages

- **Authorization:** Gavin, 2026-11-19: "1 through 5 are approved" (item 5). Then "3. C", choosing from the mock "This
  week: 142 g a day, up from 118 g last week · 5 and 6 logged days."
- **Lane:** Feature, read only. No Engine, schema, event, command, provider or dependency change. It is not a
  recommendation and never changes BEYOND's advice.

## What it does

One sentence under the 90-day line on the water, steps, resting heart rate, weight and protein pages:
"This week: 140 g a day, about the same as 135 g last week · 2 and 2 logged days."

- **Weeks:** Monday to Sunday by lived day (16:30). This week counts only its finished lived days, so the day in
  progress never drags it down.
- **Each side:** the average of its recorded days (a day per day, steps too, so a part week compares fairly). Weight
  keeps a tenth of a pound.
- **Quiet** until both weeks have at least 2 recorded days.
- **Wording:** "up from", "down from" or "about the same as", judged with the 90-day line's own floors (1 lb for
  weight, 5 g for protein, …). No score, arrow, colour or judgement.
- **Calories:** shows none. It keeps its pair of series and its own 90-day line.

## Reuse

- **REUSE:** the metric page, its `SAME_FLOOR`/`SAME_SHARE` and `DIGITS`, and Habits' Monday-week convention.
- **OWN:** `weekCompare` in `application/metricDetail.ts` and the sentence.
- **BUILD FROM SCRATCH:** none.

## Verification

- `tests/metricDetail.test.ts` (Node, UTC and America/Chicago): the averages, finished days only, the quiet
  threshold, the floors, and weight's tenth of a pound.
- `tests/browser/MetricChange001.test.tsx`: the sentence on the real protein page, and quiet with one logged day
  this week.
- MetricPage001 and MetricPage002 still pass.
