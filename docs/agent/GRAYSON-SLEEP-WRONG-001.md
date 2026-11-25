# GRAYSON-SLEEP-WRONG-001 — mark a Garmin night as wrong, or use your own times for it

- **Authorization:** Gavin, 2026-11-24. Backlog row **E7** (YOURS): "Mark an imported Garmin night as wrong and use
  your own numbers" (`/mnt/project-files/grayson/BACKLOG.md` row 7). His rule: **"I should be able to edit and tweak or
  correct everything in this app."** 05:23 CT: **"Just keep pumping out work."** Merging this brief approves the
  defaults below, including the Engine reading his corrected nights.
- **Lane: PROTECTED** (import records and sleep inputs: the sleep plan, sleep rhythm, the short-sleep rule and Delta
  read these nights). Two new event types, no new table, no Dexie version. Independent exact-head review, green CI;
  Gavin merges.
- **Starting commit:** `origin/master` `135e7b9e` or later. Re-fetch before starting. If FLIP-PLAN-001 is open,
  rebase on it once it merges (both touch `application/shiftSleepPlan.ts`).
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-sleep-wrong`, or the branch
  name its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#11** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25).

## Objective and benefit
Garmin sleep comes in through Health Bridge and is kept as source evidence (`externalSleepRecords`,
`externalSleepRevisions`). It reaches him two ways:
1. **His lived-day sleep entries.** `applyGarminSleep` (`application/garminSleep.ts`) fills them in, and he can already
   correct or remove those; Garmin never overwrites a correction.
2. **The raw night itself,** read through `getImportedSleep` (`application/externalSleepQueries.ts`) by the sleep plan
   (`shiftSleepPlan.ts`), alertness, sleep rhythm and the rotation map, Delta (`delta.ts`), the family calendar, the
   month recap and the year review. `measuredQueries.ts` (baselines, "last night", unusual streaks) and
   `wholePictureQueries.ts` read the tables directly.

The second path has no correction. A night when the watch came off at 2 a.m., or logged him "asleep" on the couch,
stays in his usual sleep times, his baselines and the plan's timing, even after he fixes the day's entry.

After this, each Garmin night has **NOT RIGHT?** with two answers: **I didn't sleep then** (the night is set aside
everywhere) or **Use my times** (his own start, end and minutes asleep stand in for Garmin's everywhere). Both show
UNDO, and the night says which one he chose.

**Benchmark:** none new. This is the Vision's "yours to change" rule applied to watch data. (Garmin's own help page on
editing sleep couldn't be read on 2026-11-25, so this brief makes no claim about Garmin Connect.)

## Recommended defaults (approved when Gavin merges this brief)
1. **Where:** on each night in DATA → Sleep · GARMIN SLEEP (`ImportedSleepEvidence.tsx`) and on last night in the sleep
   metric sheet (`SleepMetricSheet.tsx`). **NOT RIGHT?** opens two choices:
   - **I didn't sleep then:** set aside.
   - **Use my times:** start, end and asleep minutes, filled with Garmin's numbers, and SAVE. End must be after start,
     the span under 16 hours, asleep minutes no more than the span.
2. **Events** (no day, USER, append-only, like Decision Journal events):
   - `GARMIN_SLEEP_OVERRIDE_SET {commandId, recordKey, sourceVersion, mode: "SET_ASIDE" | "OWN_TIMES" | "GARMIN",
     own?: {startTime, endTime, asleepMinutes}}`.
   - The latest one for a record key wins. `GARMIN` means "use Garmin again".
   - UNDO writes the state before, so History shows each change.
3. **One effective read:** `getImportedSleep` returns the effective nights. Set-aside nights are left out. An own-times
   night carries his start and end, his asleep minutes, no stages, and `ownerTimes: true`. `sleepDurations` uses his
   minutes for such a night. A new `getImportedSleepAsRecorded` keeps the raw list for the GARMIN SLEEP evidence view
   and the importer. `measuredQueries.ts` and `wholePictureQueries.ts` switch to the effective read.
4. **His lived-day entry follows:**
   - **Set aside:** an untouched Garmin-filled entry is withdrawn (SYSTEM void, caused by the mark) and never filled
     again while the mark stands.
   - **Use my times:** the filled entry gets his asleep minutes as a USER correction, so the existing "owner corrected"
     rule keeps Garmin off it. With no entry, his minutes are logged as his own entry.
   - **An entry he already corrected or removed** is left as it is in both cases.
   - **UNDO of a set-aside** puts the withdrawn entry back with `LOG_VOID_UNDONE`, so it doesn't read as his removal.
5. **A newer Garmin version of a marked night:** his mark holds. The night says "Garmin changed this night after you
   marked it" with **USE GARMIN AGAIN**.
6. **Words:** the night reads "Set aside by you" or "Your times: 22:40 → 05:10, 6 h 05 min asleep". History: "Garmin
   night of Tue Nov 24 set aside" or "…your times used".
7. **What reads the effective nights:** everything that reads `getImportedSleep` today, including the Engine's
   short-sleep rule through the sleep plan, Delta, the month recap and year review, baselines and the sleep rhythm.
   Nothing new reads them.

## Everything is his to change
Every night: set aside, his own times, or Garmin again, each with undo. His lived-day entries stay correctable as
today.

## Design principles check (Vision, Nov 24)
- **Yours to change:** every watch night. **Fix, don't ask:** saves at once with undo. **Always says why:** the night
  says who set it. **Calm:** only on the sleep screens.

## Scope
- `domain/health/sleepImport.ts` (override types, `sleepDurations` for own times), `application/externalSleepQueries.ts`
  (effective read, `getImportedSleepAsRecorded`), `application/externalSleepCommands.ts` (`setGarminSleepOverride`),
  `application/garminSleep.ts` (set-aside withdraw and put-back, own-times correction), `measuredQueries.ts`,
  `wholePictureQueries.ts`, `domain/common/types.ts` (event types), `historyCopy.ts`.
- UI: `ImportedSleepEvidence.tsx`, `SleepMetricSheet.tsx` (+ css).
- Tests: set aside leaves every reader (sleep plan, rhythm, baselines, last night, Delta context, month recap); own
  times replace start, end and asleep minutes in each; the filled entry is withdrawn or corrected and never refilled
  while marked; an entry he corrected first is untouched; UNDO of a set-aside puts the entry back and Garmin fills it
  as before; a newer Garmin version keeps the mark and shows the line; USE GARMIN AGAIN restores Garmin's night; the
  importer still imports a marked night's new version; native backup round-trip; 320 px and axe on both screens with
  the form open.

## Excluded
Changing anything in Garmin or Health Connect. Steps, heart rate and activity hours. Adding a night Garmin never
recorded (he logs that as his own sleep today). Bulk marking.

## Acceptance
- Phone check: open DATA → Sleep · GARMIN SLEEP, pick a night, NOT RIGHT? → I didn't sleep then. The night reads "Set
  aside by you" and that day's Garmin sleep entry is gone. UNDO: both are back.
- Use my times on another night: the sleep metric sheet and the day's entry show your minutes.
- Sync Health Bridge again: your marks stay.

## Decision record
- An event keyed by the record, not a field on the import row, because the importer rewrites that row on every new
  version.
- The effective read lives in one place, so a later reader can't miss a mark.
- His corrected nights reach the sleep plan and the short-sleep rule, because a wrong night steering the plan is the
  problem this fixes.

## Stop and ask Gavin if
- A reader of raw Garmin nights can't take the effective nights without changing what a TRAIN or TODAY recommendation
  decides beyond swapping a wrong night for his.
- Health Bridge record keys aren't stable across syncs, so a mark couldn't follow its night.

## Risks
- **Missed reader:** the list above is from master `135e7b9e`; the builder greps for `externalSleepRecords`,
  `externalSleepRevisions` and `getImportedSleep` again.
- **Refill loop:** the set-aside and undo tests are the guard.
