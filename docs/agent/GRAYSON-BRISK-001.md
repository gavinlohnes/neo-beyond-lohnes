# GRAYSON-BRISK-001 — brisk minutes from his Garmin steps, with no logging

- **Authorization:** Gavin, 2026-11-25. At 8:41 PM CT he wrote: **"I was just looking at the NHS apps. I think they
  have a lot of good things we could add to the Project... Weight loss, stop smoking, getting active and the stop
  drinking app."** Then: **"Those are all fantastic ideas. I think they are all worth using."** At 8:48 PM CT he said
  **"Yes"** to writing four briefs, brisk minutes first. His goal, Nov 24: **"I'm trying to be healthy, lose weight but
  keep muscle."** His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this
  brief approves the defaults below.
- **Lane: PROTECTED** (a Health Bridge change and a new field in the activity import). No new table, no Dexie version
  (an optional field on the stored hour row; the `id, startTime` indexes stay). Two slices, each its own PR.
  Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `f8762f93` or later. Re-fetch before each slice. Slice B starts after slice A
  merges and Gavin has installed the new Health Bridge.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branches `ccr-380c4225-brisk-a` and `-b`, or the
  branch names its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#7** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It is the only
  open Health Bridge change; RUN-CUES (#683) and PLAN-FRESH (#698) are merged. FLIP-PLAN-001 (#3) doesn't touch the
  bridge.
- **What plugs in later:** WEEKLY-ACTION-001 adds "brisk 10 on N days" as a weekly focus once this lands. The Mission
  review (C4.5) can list it under what he did.

## Objective and benefit
GRAYSON knows how many steps he took each hour (`domain/health/activityImport.ts`, schema 2, from Health Bridge's
`aggregateGroupByDuration` in one-hour buckets in `MainActivity.kt` `readActivity`). It can't tell a slow hour of
pottering from ten minutes of brisk walking, so a brisk walk counts the same as standing about.

After this, Health Bridge also counts, for each hour, the minutes he walked at a brisk pace or faster, and BODY shows
**Brisk minutes** today and over the week, with a daily goal he sets (10 by default). He logs nothing.

**Benchmark (read 2026-11-25):** NHS Active 10: "Track all your walking and how many minutes were brisk (10 brisk
minutes = Active 10)", using "your phone's inbuilt sensors"
([App Store, NHS Active 10](https://apps.apple.com/gb/app/nhs-active-10-walking-tracker/id1204295312)). The page gives
no pace or step threshold for "brisk". For that we use the research: "A cadence value of ≥100 steps/min in adults
appears to be a consistent and reasonable heuristic" for moderate intensity (Tudor-Locke et al., "How fast is fast
enough? Walking cadence (steps/min) as a practical estimate of intensity in adults", Br J Sports Med 2018,
[PMC6029645](https://pmc.ncbi.nlm.nih.gov/articles/PMC6029645)). **What we copy:** brisk minutes counted for him,
with a 10-minute daily mark. **What we add:** it reads his Garmin steps he already syncs, the threshold is his to
change, and every number says what it's from. **What we keep out:** badges, rewards and streaks (anti-goals).

## Recommended defaults (approved when Gavin merges this brief)

### Slice A: Health Bridge counts brisk minutes
1. **Read the raw step records:** alongside the hourly aggregate, `readActivity` reads Garmin's raw `StepsRecord`s
   for the same window and origin (`readRecords` with page tokens, as resting heart rate already does). Health
   Connect's guide documents reading "raw StepsRecord data between a start and end time", each with "The start time
   of the measurement interval" and its end
   ([Android Developers, Track steps](https://developer.android.com/health-and-fitness/health-connect/features/steps),
   updated 2026-10-21).
2. **The count:** a record's cadence is its steps divided by its length in minutes. Every whole minute of a record
   with cadence **≥ 100 steps a minute** counts as brisk, in the hour it falls in. Records longer than **15 minutes**
   are too coarse to say and are skipped, and the hour's row says how many steps were in records too long to judge.
   Overlapping records are counted once (the newest `lastModifiedTime` wins for the overlap).
3. **The file:** schema 3 adds to each hour `briskMinutesAt` (five whole numbers, 0 to 60: the minutes at 90, 100,
   110, 120 and 130 steps a minute, or null when no record in that hour was short enough) and `stepsTooCoarse` (steps
   in skipped records). Five thresholds let him change his cadence without a new export. Schema 1 and 2 files still
   import.
4. **A check on his phone first:** Health Bridge's screen shows one new line after a sync: "Step detail: median
   record 1 min over the last 7 days; 0% too coarse to judge." This is how we learn what Garmin actually writes,
   since its write interval isn't published.
5. **Version:** Health Bridge `versionName` 0.14.0, `versionCode` 17.

### Slice B: GRAYSON shows them
6. **Import:** `validateActivitySnapshot` accepts schema 3 and keeps `briskMinutesAt` and `stepsTooCoarse` on the
   stored hour (optional fields, as calories were in GARMIN-005). A newer export replaces an older one for the same
   hour, as today.
7. **BODY · Steps metric page:** a **Brisk minutes** section: today's total against his goal ("12 of 10 brisk minutes
   today"), the last 7 lived days as bars split by work day and day off (the same split the steps baseline uses),
   and a line on what it's from: "From Garmin steps at 100 a minute or faster. 3% of today's steps couldn't be
   judged." With no schema 3 data: "Update Health Bridge to see brisk minutes."
8. **BODY dashboard:** the STEPS card adds one line, "Brisk 12 min". Nothing on TODAY, no alert, no buzz.
9. **The weekly review:** WeekInNumbers adds "Brisk 10 reached on 4 of 7 days" beside steps.
10. **His numbers:** the daily goal (10 minutes, 5 to 60) and the brisk cadence (100 steps a minute: 90, 100, 110,
    120 or 130) are two new rows on MORE · Your numbers (YOUR-NUMBERS-001), each with reset. The app reads the
    `briskMinutesAt` value for his cadence.
11. **Runs count:** a run is above 100 steps a minute, so its minutes count as brisk. The section says "includes runs"
    when a TRAIN run finished that day.

## Everything is his to change
The daily goal and the cadence, on MORE · Your numbers with reset; whether the STEPS card shows the brisk line (one
switch on the steps page, on by default). The minutes themselves are measured, not his to edit, and say what they're
from.

## Design principles check (Vision, Nov 24)
- **Asks nothing:** measured from steps he already syncs. **Always says why:** every number says it's from Garmin
  steps at his cadence, and how much couldn't be judged. **Yours to change:** goal and cadence. **Calm:** BODY and the
  review only. **Simple first:** one number a day against one goal.

## Scope
- Slice A: `MainActivity.kt` (`readActivity` reads raw `StepsRecord`s), `ActivityExport.kt` (schema 3, the new
  fields, their bounds), the bridge screen's step-detail line, `build.gradle` version, the bridge's unit tests (a
  record of 10 minutes at 1,100 steps is 10 brisk minutes; at 900 it's 0; a 20-minute record is skipped and counted in
  `stepsTooCoarse`; overlapping records count once; a record crossing an hour splits its minutes; each of the five
  thresholds).
- Slice B: `domain/health/activityImport.ts` (schema 3), `measuredQueries.ts` (brisk by period and today), the steps
  metric page, `BodyDashboard.tsx` STEPS card, `WeekInNumbers.tsx`, the two Your numbers rows. Tests: schema 1 and 2
  files import unchanged; schema 3 round-trips; a field out of bounds refuses the file as today; reading his cadence's
  value; goal and cadence changes and reset; 320 px and axe on the steps page.

## Excluded
A phone-sensor pace checker (Active 10's Pace Checker): Garmin already has the steps. GPS or speed. Badges, rewards, streaks, a daily alert. Changing TRAIN's run tracking. Counting
brisk minutes toward the burn estimate (it already uses Garmin's calories).

## Acceptance
- Slice A phone check: install the new Health Bridge, sync, and read the step-detail line. Then walk briskly for 10
  minutes, sync again, and export: that hour has about 10 brisk minutes.
- Slice B: import that file. BODY · Steps shows the brisk minutes against 10, and the STEPS card shows the line.
  Change the cadence to 110 on MORE · Your numbers: the number changes and says so; reset puts 100 back.

## Decision record
- Cadence, not speed, because Garmin's steps are already in Health Connect and Active 10 itself names no speed.
- 100 steps a minute because it's the research's "consistent and reasonable heuristic" for moderate intensity.
- The bridge sends five thresholds so changing his number never needs a new export.

## Stop and ask Gavin if
- The step-detail line shows most of his records are longer than 15 minutes (brisk minutes then can't be counted
  this way; bring the numbers and options, such as Garmin's exercise sessions, to Gavin).
- Garmin writes no raw step records to Health Connect at all.
- Reading raw records over the full history breaks Health Connect's query limits even in 30-day slices.

## Risks
- **Coarse records:** the step-detail line and `stepsTooCoarse` make it visible instead of guessed.
- **Work walking:** walking at work may count as brisk. The work-day and day-off split keeps it readable.
