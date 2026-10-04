---
id: FOUNDATION-A-F1
baseline: 449c152181b3afddf3f6bfc2093473ee2dbff545
risk_tier: ARCHITECTURAL
---

# FOUNDATION-A-F1 // LIVED-DAY SERIES (PERSONAL BASELINES IN WEEKLY)

## Mission

One pure, reusable way to ask "what is this measure over a window of lived BeyondDays?" and
"what is normal for Gavin for this kind of lived day?", built on the Day Ledger. Its first and only
visible use: a read-only YOUR USUAL section in Weekly comparing the last 7 finished lived days with
Gavin's own usual range for main sleep, water and protein, separately for work days and days off,
and saying "still learning" instead of guessing when data is thin. Owner approval 2026-10-04 of
the F1 design spec, plus the owner's addendum (no medians on categories or counts; partial logging
isn't low intake; no self-comparison; day kind from the repo) and the follow-up "fix the water
issue" (a single water entry of 40 oz or more counts as a day).

## Approved baseline

`origin/master` at `449c152181b3afddf3f6bfc2093473ee2dbff545`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-10-04.

## Risk classification

ARCHITECTURAL. New pure modules in `src/engine/` and an additive field on the Day Ledger's
`DaySummary` (`entryCounts`). No High-Risk trigger: no Engine/recommendation behavior, no schema,
persistence, backup, correction-model or fixture change.

## Authorized scope

- `src/engine/livedDaySeries.ts`: lived-day grouping (moved from Ribbon), lived-day windows of
  finished days, numeric measures with per-measure qualifying rules, `series(...)`, `quantile(...)`.
- `src/engine/personalBaselines.ts`: per measure × day kind, the baseline band, the period value
  and a verdict, or an abstention.
- `src/engine/dayLedger.ts`: additive `entryCounts: { water, food }` (entries not undone/deleted).
- `src/engine/ribbon.ts`: use F1's grouping and boundaries; identical output.
- `src/application/weeklyQueries.ts`: add `baselines` to the Weekly summary.
- `src/ui/screens/weekly/*`: one YOUR USUAL section and its copy.
- Tests and docs for the above.

Definitions (locked by this contract):

- **Day kind:** the declared work context (`DaySummary.work.declared`). UNKNOWN days are excluded.
  A lived day holding several BeyondDays is WORK if any is WORK, OFF if any is OFF and none WORK.
- **Measures:** main sleep (`sleep.primaryMinutes`, naps excluded) counts on any finished lived day
  with a main-sleep log. Water counts with 2+ water entries, or one entry of 40 oz or more
  (`MINIMUM_DAY_HYDRATE_OZ`, the app's own Minimum Day water amount). Protein (protein logs + meal
  protein) counts with 2+ food entries. Kcal, check-in capacity, workouts and urges are not in v1.
- **Windows:** period = the 7 most recent finished lived days; baseline = the 56 lived days before
  the period. They never overlap; the lived day in progress is never included.
- **Math:** baseline band = P25–P75 (linear interpolation between order statistics), widened to a
  minimum width centered on the median (sleep 30 min, water 8 oz, protein 10 g), rounded outward
  (sleep 5 min, water 1 oz, protein 1 g). Period value = median of qualifying period days, rounded
  the same way. Verdict on the rounded numbers: BELOW < low, ABOVE > high, else INSIDE.
- **Abstention:** LEARNING when the baseline has fewer than 10 qualifying days of that kind;
  NOT_THIS_WEEK when the period has fewer than 2.

## Explicit exclusions

F2–F5; Engine, recommendation, capacity or threshold changes; signed rules; outcome learning;
same-context-last-time; lesson resurfacing; timeline; command launcher; Week Ahead; schedule
exceptions; passive data (Garmin, Health Connect); native shell; new tabs or navigation; scores or
readiness; AI interpretation; silent personalization; stored thresholds or persisted baselines;
migrating any finding; new logging requirements; kcal and count/category measures; anything on
TODAY; notifications or warnings; changing other Weekly sections' windows.

## Relevant authority / references

- Owner approval 2026-10-04 of the F1 spec, the addendum, and "fix the water issue".
- Owner ruling 2026-10-03: deterministic patterns may be shown read-only in Weekly; adopting one as
  an Engine rule needs sign-off.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md`; `docs/UX_DECISIONS.md` (Day Ledger, findings, Ribbon,
  expenditure entries: NO_FAKE_PRECISION, missing stays missing, abstain below floors).
- `AGENTS.md`; `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`; `.claude/rules/engine.md`.

## Required invariants

- Pure and derived on read; nothing persisted; same input, same output.
- Missing data is never zero; a non-qualifying day is excluded, not counted low.
- The judged period is never part of its own baseline.
- `evaluate.ts`, capacity, recommendations, findings and TODAY are behaviorally unchanged.
- Ribbon output is identical.
- Weekly stays calm: at most 6 compared lines and 1 quiet line in YOUR USUAL; no color, no red.

## Acceptance criteria

- Work-day values never enter the day-off series and vice versa; UNKNOWN days enter neither.
- Below the floors, YOUR USUAL says what it is still learning, with progress, and shows no range.
- Corrections, undos and deletions are reflected through the Day Ledger, amounts and entry counts.
- One water entry under 40 oz doesn't count a day; one of 40 oz or more does; 2+ entries do.
- Outliers move the band little; a near-constant habit gets the minimum width.
- No database writes; schema version unchanged.
- Existing Ribbon, findings, Engine and full-suite tests pass unchanged.
- YOUR USUAL renders at 320–412 px wide without horizontal overflow.

## Required verification

- New engine, integration and browser tests for the criteria above.
- `npm run check:architecture`.
- `npm run check:risk -- 449c152181b3afddf3f6bfc2093473ee2dbff545`.
- `npm run verify`.
- `git diff --check`.
- Exact-head PR Verification after the PR opens.

## Builder expectations

- Claude Code builds (primary builder, `AGENTS.md`). Smallest coherent implementation; no adjacent
  work. Open the PR, update the handoff note, stop.

## Reviewer expectations

- A separate session reviews the exact PR head: window non-overlap, day-kind isolation, abstention,
  water/protein qualifying rules, Ribbon parity, Engine/findings untouched, mobile widths.

## Integrator expectations

- Merge only on the owner's say-so, with exact-head CI green. Then close the Drop and start the
  field-test stop: about 3 work rotations (~3 weeks) before any F2/F3/F4 work.

## Stop / escalation conditions

- Stop if correctness needs an Engine, schema, persistence or new-logging change, or a change to
  findings' behavior.
- Stop if Ribbon parity can't be kept with the shared grouping.
- Stop if Weekly can't hold the section within its line caps.
