# YEAR-REVIEW-001 — your year in BEYOND, built on the month recap

- **Authorization:** Gavin, 2026-11-15, approved the overnight sprint plan ("Approved. If you have anything you want to
  change ask me and I'll decide."), whose Wave 3 includes "year-in-review built on the monthRecap cards"; on his return
  he asked to resume the next ranked items, ready for Claude's review, without merging. Bounded: a read-only year view
  that adds up the month recap's months; no Engine rule, alert kind, migration/schema, dependency or TODAY change.
- **Builder:** Grok Bot. Branch `codex/year-review-001` from fetched `origin/master` `b921d303` (#557 merged).
  Worktree `/workspace/year-review`.
- **Lane: FEATURE.** Pure application rollup plus one tap-to-open UI block on MONTH. `npm run check:risk` may suggest
  PROTECTED only because this brief and the checkpoint sit on governance paths; they record the approved objective and
  amend no doctrine or authority. Semantically: no Engine, schema, event, persistence write, backup, permission,
  notification, navigation or dependency change; no AI.
- **Overlap check:** open PRs #558 (follow-ups, Bridge), #559 (experiment statistics), #560/#561 (Alfred) do not touch
  `monthRecap`, `monthQueries` or MONTH.

## What changes

- `src/application/monthRecap.ts`: the recap's counting rules are exported as small pure helpers so a year is the same
  months added up, never recounted another way: `bestRun`, `noteDays` (tag and People days), `finishedIn` (experiments
  closed in a local month) and `monthRhythm` (a month's sleep timing). `deriveMonthRecap` and `getMonthRecap` use them;
  output unchanged (existing tests untouched and passing).
- `src/application/monthQueries.ts`: `getMonth`'s body becomes pure `monthDays(summaries, year, month)`, so the year
  reads the summaries once. Same day boundary: a lived day is dated by the local calendar day it starts on.
- `src/application/yearReview.ts`: pure `deriveYearReview` and loader `getYearReview(year)`. Same records as the recap
  (day ledger, latest check-in energy per day, daily notes, People, experiments, imported Garmin sleep).
  - A month **counts** from 7 logged days. Thinner months are named ("Left out, too little logged …") and excluded
    from every figure; months with nothing recorded and months not reached yet are labelled, not counted. The header
    shows "N of 12 months counted"; every card says what it rests on.
  - Cards, in the recap's order: **MONTH** (counted months, logged/work/off days; sleep and protein averages over logged
    days, highest and lowest month, trend), **BEST_RUN** (the highest of the monthly best runs; runs end at a month's
    edge as in the recap), **SLEEP** (work-day sleep middle per timed month, measured from the first timed month so
    midnight never splits it; latest/earliest month, trend), **TRAINING** (total, per counted month, highest/lowest,
    trend), **TAGS** and **PEOPLE** (days and months), **EXPERIMENTS** (closed in a counted month).
  - A month's sleep or protein figure needs 3 logged values in it. Highest/lowest needs 2 months; a trend needs 4
    (last half of those months against the first half, the middle one sitting out when odd), with an "about the same"
    band (15 min, 10 g, 0.3 energy, 2 workouts). Wording is "highest/lowest", never best/worst; no score or advice.
- `src/ui/screens/systems/YearReviewView.tsx`: SEE YOUR YEAR IN BEYOND under the month recap on MONTH (for the year of
  the month on screen). One readable list of cards, a "Which months count" disclosure, DONE. No navigation change.

## Acceptance evidence

- Node `tests/integration/yearReview.test.ts`: empty year; only thin months; a partial year (thin month excluded from
  every card, exact highs/lows/trends, AHEAD months); under four months (no trend) and one month (no high/low); year
  boundary (a lived day starting 23:30 on 31 Dec is December's, 00:30 on 1 Jan is January's; an experiment closed at
  00:30 on New Year's Day belongs to the new year). `tests/integration/monthRecap.test.ts` unchanged and passing.
  Both under `TZ=UTC` and `TZ=America/Chicago`.
- Browser `tests/browser/YearReview.test.tsx` at 320px with axe: opens from MONTH, counted months and tags from seeded
  records, the month statuses, no horizontal overflow, writes nothing; a thin year says there is nothing to add up.
  Both time zones. `MonthRecap.test.tsx` unchanged and passing.
- Gate: `TZ=UTC npm run verify`; required CI; Claude review; Gavin merges.

## Deferred

- Comparing with the previous year; an Alfred-written year letter; per-month drill-down from the year view.
