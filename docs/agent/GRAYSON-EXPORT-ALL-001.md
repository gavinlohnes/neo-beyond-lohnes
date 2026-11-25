# GRAYSON-EXPORT-ALL-001 — the rest of his records as spreadsheet files: sleep, check-ins, journal, notes, home, people, work

- **Authorization:** Gavin, 2026-11-24. Campaign row **C8.3** "Export everything readable": "CSV export adds sleep,
  check-ins, journal, home and people. Done when: each new file opens in Sheets; corrections applied; sensitive
  categories opt-in" (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Campaign 8). 8:18 PM CT: **"What's the next best move? ... I
  want to work in the best possible way."** His rule: **"I should be able to edit and tweak or correct everything in
  this app."** Merging this brief approves the defaults below.
- **Lane: FEATURE** (read-only, adds export areas; no stored data, no Engine, no Delta). Green CI and another
  builder's PASS; self-merge allowed under the Nov 19 charter.
- **Starting commit:** `origin/master` `a226fd62` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-export-all-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#15** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It shares no files
  with the briefs before it, so it can go first whenever the next one is waiting on a merge.
- **Builds on:** EXPORT-001 (`application/recordsExport.ts`, `ui/screens/more/RecordsExportPanel.tsx`), which already
  exports daily totals, weight, meals, workouts and measurements.

## Objective and benefit
MORE · Export records gives him five areas today. His sleep nights, check-ins, decision journal, daily notes, home
jobs, people's dates and the new work record (#706) can't leave the app in a form he can open, so they're his only
inside GRAYSON.

After this, the same panel exports each of them as its own CSV file, built the same way: corrected values, the 16:30
lived day on every row, empty cells for missing values. The private ones ask once before the file is made.

**Benchmark:** none new. This extends EXPORT-001's own format, which was benchmarked there.

## Recommended defaults (approved when Gavin merges this brief)
1. **Seven new areas,** each one file, one row per record, the same CSV rules (`csvCell`, `toCsv`, the formula guard):
   - **Sleep:** each sleep period the sleep metric sheet counts: lived day, start, end, minutes, main or nap, source
     (Garmin or typed), and whether a later revision replaced it (only the newest revision is a row).
   - **Check-ins:** lived day, time, energy, stress, mood, soreness, alcohol urge, with corrections applied
     (`checkInCorrections`), plus a `corrected` column (yes or empty).
   - **Journal:** each decision journal entry: date, the decision, his reason, status, the outcome when reviewed, and
     the missed reason (C6.5) when there is one.
   - **Daily notes:** lived day, last changed, the note's text.
   - **Home:** each home job and each kept home fact: kind (job or fact), title, next due date, how often, status,
     saved date.
   - **People:** each yearly date and each kept fact about someone: kind, title, next date, saved date.
   - **Work record:** each item from `workRecords` that isn't removed: kind, title, date, hours, expiry, status.
2. **Private areas ask first:** Check-ins, Journal, Daily notes and People sit in their own row of chips headed
   **PRIVATE**. Choosing one and tapping EXPORT shows once, before the file is made: "This file has your check-ins
   (mood, stress, alcohol urge). It leaves your phone when you share it." with **EXPORT** and **CANCEL**. That is the
   opt-in, every time. The other areas export as today.
3. **Removed and stopped records stay out:** a removed work item, a stopped memory or an undone check-in never
   appears, as EXPORT-001 already does for superseded entries.
4. **Opens in Sheets:** UTF-8 with a header row, one value per cell, dates as YYYY-MM-DD and times as HH:MM, text with
   commas or line breaks quoted. A note's line breaks stay inside one cell.
5. **Preview as today:** the row count and date range show before anything leaves. File names follow
   `exportFileName` (`beyond-check-ins-2026-11-25.csv`).

## Everything is his to change
Which area he exports and when. The records themselves are fixed where they live; this only reads them.

## Design principles check (Vision, Nov 24)
- **Yours:** every record he keeps can leave as a file he owns. **Calm:** a MORE panel, nothing on TODAY. **Always
  says why:** the private confirmation says what's in the file. **Simple first:** one file per area, the same columns
  style as the five he has.

## Scope
- `application/recordsExport.ts` (`ExportArea` gains `sleep | checkins | journal | notes | home | people | work`,
  `EXPORT_AREAS` labels, a `PRIVATE_AREAS` set, one builder per area), `RecordsExportPanel.tsx` (+ css: the PRIVATE
  row and the confirmation).
- Tests: each area's header and one row against fixture data; corrected check-ins export the corrected value; only
  the newest sleep revision is a row; removed and stopped records are absent; a note with a comma, quote and line break
  round-trips through a CSV parser as one cell; private areas show the confirmation and CANCEL makes no file; the five
  existing areas are unchanged; 320 px and axe on the panel with the confirmation open.

## Excluded
Import. Quit tracker and Delta's memory list (kept for C5.5's choices, not a spreadsheet). Garmin's raw files. Any
backup change (CSV is not a backup). Sending files anywhere but the share sheet or a download.

## Acceptance
- Phone check: MORE · Export records shows the new areas and a PRIVATE row. Export Sleep and open it in Google
  Sheets: one row per night with the lived day.
- Correct a check-in, then export Check-ins: the confirmation shows first, and the file has the corrected value marked
  corrected.
- Export Work record: removed items aren't in it.

## Decision record
- One file per area, matching EXPORT-001, so each opens cleanly in a sheet.
- People counts as private because it holds other people's dates and facts.
- The confirmation shows every time, not once ever, because the share sheet can send the file anywhere.

## Stop and ask Gavin if
- An area's records can't be read with corrections applied.
- A home or people fact is still only in the old memory table after ONE-MEMORY-001 (export both kinds, marked, and
  say so in the PR).

## Risks
- **Private data leaving:** the confirmation and its plain words are the guard.
- **Columns drifting from the screens:** each builder reads the same queries the screens use.
