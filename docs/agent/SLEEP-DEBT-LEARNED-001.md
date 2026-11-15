# SLEEP-DEBT-LEARNED-001 — sleep owed against your own learned sleep, not a fixed 7 hours

- **Authorization:** Gavin, 2026-11-15, chose item 2 of the ranked opportunities ("Measure sleep debt against your own
  learned sleep, not a fixed 7 hours") as a bounded mission: recalculate sleep owed against the existing personal
  baseline (`engine/personalBaselines.ts`) instead of a fixed 7 hours; separate work days and days off where the
  baseline already supports it; show "still learning" with how many days the baseline is based on when evidence is
  thin; leave the Engine rules unchanged (readout only); full gate; update the checkpoint; open a PR; do not merge.
  [BEYOND-4.0](BEYOND-4.0.md) decision 1 lists sleep debt among the things BEYOND may learn; this is the read-only
  half (no learned Engine rule).
- **Builder:** Grok Bot. Branch `codex/sleep-debt-learned-001` from fetched `origin/master` `4d74ac26` (#554 merged).
- **Lane:** see the PR and checkpoint (classifier output plus semantic reading). No Engine, schema, backup, permission,
  dependency or provider change; `src/engine/**` is untouched.
- **Active PR:** pending until opened; linked from the checkpoint.

## What changes

- **Target source.** `src/application/sleepDebt.ts` (`deriveSleepDebt`, pure) replaces the fixed `SLEEP_NEED_MINUTES`
  (7 h) in `getSleepDebt`. Each night is judged against the **low end of the operator's usual main-sleep range for that
  kind of day**, read straight from `projectPersonalBaselines` (MAIN_SLEEP, WORK / OFF): the 56 lived days before the
  last 7, at least `MIN_BASELINE_DAYS` (10) days of the kind, middle half with a 30-minute minimum width, rounded
  outward to 5 minutes. These are exactly the numbers Weekly's PERSONAL BASELINES shows, and the same "short night"
  line SLEEP-ENGINE-001 uses, so there is one source of truth and no new statistic.
  - **Why the low end, not the median.** Owed accrues only on nights below your usual range. Against the median, half
    of your ordinary nights would "owe" and none repay, so a perfectly normal week would always show debt; that is the
    false precision the doctrine forbids. The low end means "short for you".
- **Work / off split: supported, used.** The baseline already groups by the declared work context of each lived day,
  so a work night is judged against the work target and a night off against the off target. A day whose work context
  is UNKNOWN is not judged (the baseline has no target for it); it is not given either target.
- **Thin evidence: still learning, no figure.** A kind with fewer than 10 baseline days is LEARNING (`have` of `need`).
  A logged day of a learning kind is not judged and adds nothing. When no logged day can be judged, there is **no owed
  figure at all** and the readout says it is still learning, with each kind's day count. Chosen over a 7-hour
  fallback: personal baselines' own rule (NO_FAKE_PRECISION: "with too few comparable days it says it's still learning
  and shows no range"), doctrine's honest uncertainty, and BEYOND-4.0 decision 1 ("abstains when evidence is thin").
  A silent 7-hour fallback would mix two different meanings under one label. When one kind is learned and the other
  isn't, the figure covers the judged days only and says how many logged days were not counted.
- **Shown with its basis.** Every readout names the target and how many days it is based on, e.g. "work days 5h30 (from
  25 days), days off 7h20 (from 23 days)", or "days off still learning (4 of 10 days)".
- **Unchanged rules.** The last 7 lived days with sleep logged (not yet begun days excluded); main sleep plus naps count
  toward the night; a night at or above target owes nothing and repays nothing (no negative debt), as before.
- **One small correction.** The window is now 7 *lived days*, not 7 day records: a lived day with two records (a day
  ended early and another started) is one night with one target, matching the baselines; before, each record was
  charged a full 7 hours.

## Consumers (all found by `rg getSleepDebt|sleepOwed|SLEEP_NEED_MINUTES`)

| Consumer | Change |
|---|---|
| DATA → MONTH status line (`CaveMonth.tsx`) | Owed below your usual, with both targets and day counts; still-learning line with counts; unjudged days named. |
| Week Ahead ENERGY FORECAST line (`WeekEnergyForecast.tsx`) | Same, in the forecast's wording. |
| Recovery-sleep offer (`forecastActions`, FORECAST-DECIDE-001) | **Threshold unchanged (≥ 60 min owed)**; it now reads the learned figure and is never offered while still learning (no figure). Material effect: it appears only when you are an hour short of *your* usual, which is usually less often than against 7 h for a night worker (the seeded test week owes 58 min against his usual, so no offer; a 3-hour night tips it over). Still confirm-first; it only adds a plan item. |
| Alfred's context (`operatorContext.ts`, SLEEP_SUMMARY) | States the learned targets and day counts, or "no figure yet … do not substitute a fixed 7 hours". |
| Engine | **Never read it, still doesn't.** No `src/engine/**` change. SLEEP-ENGINE-001's short-sleep rule already uses the same personal baselines and is untouched. |
| Month grid short-night underline and legend, MONTH-LETTER "nights under 7 hours" | **Left on the 7 h adult guideline** (`SLEEP_NEED_MINUTES`). They are per-night guideline markers, not the owed figure; the legend now says "the 7 h guideline". Moving them to the learned target is a separate presentation choice (deferred). |

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** `projectPersonalBaselines` (FOUNDATION-A-F1) for the targets and their day counts; `groupLivedDays` for
  lived days and their work context; the existing `getSleepDebt` consumers and the LEARNING copy pattern (pace, cave
  vitals). Same application-layer use of engine primitives as `pace.ts` / `personalUnderstandingQueries.ts`.
- **OWN:** the mapping of nights to their kind's target, the no-figure-while-learning rule, and the copy.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- `tests/integration/sleepDebt.test.ts` (node; run under `TZ=UTC` and `TZ=America/Chicago`; two "now"s, one with the
  US DST change inside the windows): learned target equals Weekly's baseline low; work vs off targets; last-7 window;
  still learning with day counts and no figure; one kind learned, the other learning; UNKNOWN not judged; above target
  owes nothing (no negative); naps count and two records in a lived day are one night; nothing logged.
- `tests/integration/operatorContext.test.ts`: Alfred's still-learning line, no 7 h.
- Browser: `Month001` (still-learning line; new learned readout over the eight-week seeded rotation with both targets
  and day counts, axe clean), `WeekEnergyForecast` (learned wording), `ForecastDecide001` (offer only when owed ≥ 1 h
  against his usual; the seeded week alone gets no offer).
- Full gate `TZ=UTC npm run verify`; PR CI. Gavin merges.

## Deferred

- A learned **Engine** sleep-debt rule (BEYOND-4.0 decision 1, Protected): not built; this is a readout.
- Month grid underline / MONTH-LETTER count against the learned target instead of the 7 h guideline.
- A judged-day window that never overlaps the baseline when logging is sparse (the last 7 *logged* days can reach back
  into the baseline's 56 days; the effect is small and the window rule was kept as before).
- Garmin-measured sleep baselines (`domain/health/baselines.ts`) are a different, measured-only series and are not used.
