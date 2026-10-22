# GARMIN-005 — eaten vs burned

**Authorization:** Gavin approved this objective on 2026-10-22 ("Approved. Make it amazing")
with these defaults: put CALORIES next to PROTEIN; burned means Garmin total calories (resting plus
active); do not show an eaten-minus-burned number; show Garmin freshness and call out data older
than 12 hours. **Lane:** PROTECTED because it adds a Health Connect permission and changes TODAY's
numbers. **Builder:** Claude Code, handed off to Codex to finish. **Start:** `8a4b80d`, stacked on
GARMIN-004 PR #269. **Branch:** `claude/garmin-005`; **PR:** #271.

**Leverage gate:** INTEGRATE PROVIDER. Use Health Connect's existing total- and active-calorie
records through the existing local helper/export/import path. No dependency, account, server,
subscription, schema migration or backup-format change.

## Scope

- Health Bridge 0.6.0 requests read access for total and active calories burned and exports hourly
  totals in activity format 2. BEYOND continues to accept format 1; importing an older file never
  erases previously stored calorie values. A newer export with calorie access unavailable preserves
  each earlier value and its original freshness timestamp rather than presenting it as newly read.
- TODAY adds a CALORIES tile only when Garmin supplied calories. It shows calories eaten from
  BEYOND meal logs beside total calories burned from Garmin. STEPS and CALORIES each span two
  columns so the grid remains balanced.
- The CALORIES sheet compares eaten and burned today, across 7 days and 4 weeks, and as daily
  averages by week for one year. Missing eaten data is "Not logged"; missing Garmin data is "Not
  measured". Today is excluded from completed-period averages.
- TODAY shows the Garmin timestamp when data is over 12 hours old. The sheet always shows it.
- Weekly keeps its weight-trend expenditure estimate and adds Garmin's measured average beside it,
  with an explicit watch-error caveat.

## Exclusions

No Engine, recommendation, calorie target, goal, budget, net/remaining/deficit/surplus number,
nutrition judgment, schema migration, backup change, cloud service or new runtime dependency.
Garmin values remain display-only estimates; meal logging remains the source of eaten calories.

## Wording

| Where | Copy |
|---|---|
| Tile | `CALORIES` · `1,300 eaten` · `540 burned` |
| Tile spoken label | `Calories eaten 1,300, burned 540 so far, open calories` |
| Sheet title and ranges | `CALORIES` · `TODAY` `7D` `4W` `1Y` |
| Today legend | `Eaten (logged)` · `Burned (Garmin)` |
| Today chart label | `Today so far: eaten 1,300 kcal, burned 540 kcal.` |
| Period summary | `kcal a day on average · 8 logged days, 27 measured · today left out` |
| Readout/table | `Wed, Oct 21 · eaten 1,300 · burned 540 so far` · `Not logged` · `Not measured` |
| Usual | `Usual burned: 2,418 kcal · median of the last 28 days.` |
| Freshness | `Garmin as of 22:10.`; when older than 12 h: `Garmin as of Wed, Oct 21, 22:10. Send from the helper to update.` |
| Meaning/caveat | `Burned is Garmin’s estimate, resting plus active; watch estimates can be off by 10–20%. Eaten is what you logged.` |
| Weekly | `Garmin says about 2,418 kcal a day (28 measured days). Watch estimates can be off by 10–20%.` |

## Acceptance

Both activity formats import without losing data, including a format-2 export after permission is
revoked; the helper permission/export contract is tested;
the tile is absent without Garmin calories; tile and sheet values, completed-period counts,
freshness, missing values, focus return, read-only behavior, 320/390 px fit and axe checks pass;
Weekly shows the measured comparison; `npm run verify` and the helper CI workflow pass. Screenshots
live in `docs/screenshots/garmin-005/`. Physical-phone permission and export remain a post-merge
field check; the helper cannot be compiled on this machine without the Android SDK.
