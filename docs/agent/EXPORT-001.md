# EXPORT-001 — readable CSV export

- **Status:** brief only. **No code has been written and no builder is assigned.**
- **Origin:** [HARVEST-001](harvest/HARVEST-001.md) backlog #5 and mission sequence step 2 (after METRIC-PAGE-001,
  whose hydration and steps pilot merged as #519).
- **Authorization:** Gavin, 2026-11-14, in Claude chat, when offered "follow the harvest's order: CSV export, then
  the habit upgrade": "Do whatever you think is best. I will allow it this time." That approves preparing this
  mission. **The build starts on Gavin's go to the active builder**, and every merge is still his.
- **Lane:** FEATURE, read only. No Engine, schema, command, event or information-architecture change.
  - **Owner note on privacy:** a CSV is a plain, readable copy of personal records that leaves the app, as the
    JSON backup already does. It goes only where Gavin sends it. If `npm run check:risk` or the builder judges this
    a Protected privacy boundary, stop and ask before building.
- **REUSE:**
  - the delivery pattern in `ui/screens/weekly/CalendarExportPanel.tsx` (`deliverCalendar`: share sheet first,
    download as the fallback, and a plain receipt line);
  - the existing read queries for each area, so the files carry the same corrected values the screens show
    (`historyQueries`, `trainHistoryQueries`, `foodDiaryQueries`, `dayLedgerQueries`, `measurementQueries`,
    `externalSleepQueries`; the builder confirms the exact functions);
  - the EXPORT BACKUP group in `ui/screens/more/MoreScreen.tsx` as the home.
- **OWN:** one small pure CSV writer and the column mapping for each area.
- **BUILD FROM SCRATCH:** none. No dependency: a CSV writer is a few lines, and a library would add maintenance
  for no gain.

## Why

BEYOND's only export is the JSON backup, which is for restoring, not reading. Strong offers CSV export
(HARVEST-001, reference matrix). A readable file lets Gavin open his own records in a spreadsheet, and it is the
plainest proof of "owned data".

## What it does

In MORE, beside EXPORT BACKUP, one quiet entry: **EXPORT RECORDS (CSV)**. It opens a short sheet:

1. Pick an area. Each shows its row count and date range before anything is exported.
2. Tap EXPORT. The file goes to the share sheet, or downloads where sharing isn't available.
3. A receipt line says what happened, for example "Shared 412 rows · 2026-05-04 to 2026-11-13."

| File | One row is | Columns (minimum) |
|---|---|---|
| `beyond-weight-<date>.csv` | a weigh-in | lived day, time, weight, unit, source |
| `beyond-workouts-<date>.csv` | a performed set | lived day, session, exercise, substituted name, set number, weight, reps, skipped |
| `beyond-meals-<date>.csv` | a logged meal | lived day, time, name, calories, protein, carbs, fat |
| `beyond-days-<date>.csv` | a lived day | lived day, work or off, water, steps, calories, protein, main sleep, source for each measured value |
| `beyond-measurements-<date>.csv` | a measurement | lived day, site, value, unit |

## Rules

- **Corrected truth only.** Export what the screens show after corrections, never raw event history. A superseded
  entry does not appear.
- **Lived days.** Every row carries the 16:30 lived-day id, and the clock time where one exists.
- **Missing is not zero.** An unrecorded value is an empty cell.
- **Sources stay visible.** Garmin values are marked as Garmin; owner entries as owner.
- **Safe cells.** Quote per RFC 4180. Prefix a cell that starts with `=`, `+`, `-` or `@` so a spreadsheet can't
  run it as a formula. Free-text names (meals, substitutions) are the cells at risk.
- **Not a backup.** This never calls `recordBackupExported`, never changes the backup reminder, and has no import.
- **Offline.** Works with no signal and no account.

## Excluded

Import of any kind; journal, notes, people and photos (free text and images deserve their own decision);
scheduled or automatic export; Drive upload; any change to the JSON backup format.

## Acceptance

- Each file opens in Google Sheets with the right columns and one header row.
- A corrected weigh-in appears once, with its corrected value.
- A day with no water logged shows an empty cell, not 0.
- A meal named `=SUM(A1)` arrives as text.
- Row counts in the sheet match the exported file.
- An empty area says "Nothing to export yet" and offers no button.
- Cancelling the share sheet says "Export cancelled." and writes nothing.
- Controls meet the locked 16 px minimum and use foundation tokens.
- Tests: the CSV writer (quoting, formula prefix, empty cells) in Node; one real-Chromium test for the sheet's
  preview, export and cancel paths.

## Next after this

HABIT-RHYTHM-001 with lifestyle-logging parity (HARVEST-001, section 6).
