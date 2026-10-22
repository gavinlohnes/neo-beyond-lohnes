# GARMIN-004 — Garmin numbers you can see

**Authorization:** Gavin approved on 2026-10-22 ("I approve and make it so. Give me Garmin-004"),
after reviewing the plan that drew on his Garmin Connect screenshots. It delivers GARMIN-003's
deferred "tiles and TODAY show measured values labelled Garmin". GARMIN-003 asked for the wording
to be shown first: every string is listed below, and the PR waits on his review of it.
**Lane:** PROTECTED (changes TODAY's numbers). **Builder:** Claude Code.
**Start:** stacked on FIELD-AUTHORITY-001 (#268), which also changes TODAY's tiles.
**Leverage gate:** BUILD OWNED. Hand-drawn SVG charts from existing stored Garmin data; no new
dependency, permission, schema, import format or backup change.

## Scope

- **TODAY numbers.** With any Garmin data, STEPS and RESTING HR join PROTEIN, WATER, WEIGHT and SLEEP
  (three across). Each Garmin tile shows the value and your usual; SLEEP shows your usual too.
  Without Garmin data TODAY is unchanged (four tiles).
- **Detail sheets** over TODAY (no tab change), from the Garmin tiles:
  - STEPS: TODAY (running total line against your usual) · 7D · 4W · 1Y (weekly totals).
  - RESTING HEART RATE: 7D · 4W · 1Y (weekly averages).
  - SLEEP: LAST NIGHT (hypnogram, stage minutes) · 7D · 4W · 1Y; ALL SLEEP RECORDS opens the
    existing sleep history.
  - Tap a bar to read it; "Show as table" lists every value.
- **Usual** is GARMIN-003's 28-day median by lived day (steps split work/off), shown only with 14+
  measured days; otherwise it says how many it has.

## Exclusions

No Engine, recommendation or advice change (baselines softening advice stays a later objective).
No new Health Connect permission (calories burned is GARMIN-005). No comparisons with other people,
streaks, auto goals or Body Battery. No medical claims.

## Wording (for Gavin's review)

| Where | Copy |
|---|---|
| Tile labels | `STEPS` · `RESTING HR` · `SLEEP` |
| Tile meta | `USUAL 4,990` / `USUAL 60` / `USUAL 6:50`; before a usual exists: `GARMIN`; nothing today: `NOT MEASURED` |
| Sheet titles | `STEPS` · `RESTING HEART RATE` · `SLEEP` |
| Ranges | `TODAY` `7D` `4W` `1Y` · `LAST NIGHT` |
| Steps today | `1,750 steps so far today`; none yet: `No steps measured yet today. Send from the helper to update.` |
| Averages | `5,106 average a day` · `average a week` (1Y steps) · `average a night` (sleep) |
| Totals | `142,960 steps in 28 measured days.` |
| Bar readout | `Wed, Oct 21 · 1,750 so far` · `Tue, Oct 20 · not measured` · `Week of Oct 12 · 34,120 that week` |
| Last night | `4h 35m asleep · 06:45 → 12:15`; stage rows `Awake` `REM` `Light` `Deep` with `Not recorded` when Garmin left a stage out; no stages: `Garmin sent no sleep stages for this night.`; none: `No Garmin sleep in the last 24 hours.` |
| Usual | `Usual on work days: 4,990 · median of the last 28 days.` / `Usual: 60 bpm · …` / `Your usual appears after 14 days of Garmin data (9 so far).` / `Usual steps need today set as a work day or a day off.` |
| Footer | `Measured by Garmin. A day with no measurement is missing, not zero. Nothing here changes BEYOND's advice.` |
| Button | `ALL SLEEP RECORDS` |

## Acceptance

Tiles appear only with Garmin data; values, usual and spoken labels are correct; each sheet opens
over TODAY, switches range, reads bars, shows a table, returns focus on close and writes nothing;
a missing stage reads "Not recorded"; axe passes on the sheets; no overflow at 320–412 px;
`npm run verify` passes. Screenshots in `docs/screenshots/garmin-004/`.
