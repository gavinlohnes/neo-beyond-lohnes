# FOOD-SOURCES-001 — where your calories and protein came from

- **Authorization:** Gavin, 2026-11-15: "I approve food source as the next objective", on the proposal "a short list
  of your main sources over 7 or 30 days, on the calories page and in protein's history; tap a row to see the days;
  read only, no judgement".
- **Builder:** Claude Code. Branch `ccr-88f5c085-food-sources`, built on #530 (the calories page). Feature lane: no
  independent review required; Gavin merges.
- **Origin:** [HARVEST-001](harvest/HARVEST-001.md) backlog #10, nutrient contributors (Cronometer's "contributing
  foods": ideas only, no code).

## What Gavin sees

**WHERE IT CAME FROM · LAST 30 DAYS**, with the top five sources, then "…and N other meals":

> Rice bowl · 6,500 kcal · 77% · 10 times
> 8,400 kcal logged on 10 of the last 29 finished days; days with nothing logged are left out.

- **Calories page:** in the 7D and 30D ranges, for the eaten side.
- **BODY's history (YOUR PROGRESS):** for meal calories and protein, over the chosen 7, 28 or 90 days. Protein's quick
  logs count as one source, "Protein (quick log)".
- **A row opens** the lived days it was logged on, newest first, each with that day's amount. In BODY, a day opens that
  day's records, where corrections live.

## Rules

- Your own logs only, as they stand after corrections; undone meals are left out.
- A saved meal is one source, even if renamed (it shows its newest name). A meal typed by hand is grouped by name,
  trimmed and ignoring case.
- Finished lived days in the window (7, 28, 30 or 90 × 24 hours back); today is not counted. A day is named by its
  16:30 start.
- Missing is missing: days with nothing logged are counted and left out, never zero.
- No judgement: no "bad", "cut", "avoid" or "too much", and no suggestion. Read only: nothing is written.

## Excluded

Fiber, sodium or other nutrients (not stored); food-database lookups; targets per food; any Engine or recommendation
input; schema, dependency or provider changes.

## Leverage gate

- **REUSE:** `getMealEntries` and `getProteinEntries` (corrected, voids dropped), `getDaySummaries`, the metric page and
  BODY's InsightsExplorer with its existing open-the-day route.
- **OWN:** the grouping (`application/foodSources.ts`) and the list (`ui/metrics/FoodSources.tsx`).
- **BUILD FROM SCRATCH:** none.
