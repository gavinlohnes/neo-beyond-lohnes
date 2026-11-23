# GRAYSON-LOG-WHEN-001 — WHEN gets a day and the shift (logger upgrade 1 + 2)

- **Owner authorization:** Gavin, 2026-11-23: "In the future I'd like to see a improved logger. I can select time but
  not a day." On the proposals: "First: 1 + 2 together, as one 'When' upgrade. Day picker plus shift-shaped times."
- **Lane:** PROTECTED (amends the locked LOG-TIME-001: a log may now land on an earlier lived day). Independent
  exact-head review, green CI and Gavin's merge required. **Builder:** Claude Code. **Starting commit:** master
  `e0b12d13`. **Branch / PR:** opened after #619 merges (no stacking).
- **Operator benefit:** the chili he ate at 02:00 and forgot to log until he woke up goes on last night's day in two
  taps (YESTERDAY, then a time or SHIFT END), instead of landing on the wrong day or not at all. On any work day the
  times he actually thinks in (start, middle, end of shift, the hour after) are one tap each.
- **Rules:**
  - The water and meal sheets gain a DAY row: TODAY (default), YESTERDAY and EARLIER… (the lived days on record from
    the last 7). It shows only when an earlier day exists. Each open of the sheet starts at TODAY.
  - An earlier day has no "now": NOW and AGO leave, and the sheet asks "Pick when on yesterday." until a time or a
    shift point is chosen. Logging without one shows that sentence as the error and writes nothing.
  - A SHIFT row (START · MID · END · AFTER, each with its clock time) shows when the chosen day has a shift by the
    saved schedule (days marked OFF have none). AFTER is the end plus 60 minutes.
  - The log is recorded on the chosen day with LOG-TIME-001's rules unchanged: only inside that day's own 16:30 to
    16:30, the entered-at time kept, totals counted as always. The receipt names the day: "16 oz recorded yesterday
    at 06:00."
  - Nothing is moved or rewritten. That day's Engine advice is not re-run; its derived reads (totals, BODY, history)
    include the log the next time they are read, as with any log.
- **REUSE:** LOG-TIME-001's WHEN row, `resolveWhen`, `checkLogTime`/`placeInDay`; the commands already take a day id;
  `livedDayShiftWindow` and `mostRecentBoundaryAtOrBefore` from the Engine's pure schedule math. MyFitnessPal's diary
  day switch and Apple Health's "Date & time" on manual entries as patterns. **OWN:** `application/loggableDays.ts`
  (`deriveLoggableDays`, `getLoggableDays`), the SHIFT kind in `logTimes.ts` (`shiftPointAt`), the DAY and SHIFT rows.
  **BUILD FROM SCRATCH:** none.
- **Exclusions:** no schema, event, command, Engine or backup change; protein (BODY) and Alfred/stealth logging keep
  their current paths; no post-shift catch-up (next objective); retime still moves only within a log's own day.
- **Acceptance:** pure tests (shift points, no-shift refusal, day list window/labels/one-per-lived-day/OFF); an
  integration test putting water and a meal on yesterday by SHIFT END and AT, today untouched, outside-day refused;
  browser at 320/360/412 px (DAY row, NOW hidden on an earlier day, hint, SHIFT END tap, receipt, record on yesterday,
  no overflow, axe); LOG-TIME-001 suites unchanged; full suite.
