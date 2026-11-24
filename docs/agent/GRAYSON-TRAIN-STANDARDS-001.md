# GRAYSON-TRAIN-STANDARDS-001 — record your standards tests: 1.5-mile run, sit-and-reach, one-minute sit-ups

- **Authorization:** Gavin, 2026-11-24. Backlog row **B4** (CONNECT, ranked 8th); GRAYSON-TRAIN-RUN-001 names it as
  the next slice ("1.5-mile standard follows as B4 (his pick 4A)"). At 04:38 CT: **"Now let's start giving Claude
  stuff to work on. Work on finishing train"**. His rule: **"I should be able to edit and tweak or correct
  everything in this app."** Merging this brief is his approval of the defaults below.
- **Lane: PROTECTED.** One new domain event type and its stored history. No new table and no Dexie version (events
  already persist); no Engine, notification or navigation change.
- **Starting commit:** `origin/master` `439129c`. Re-fetch before starting.
- **Builder:** Claude Code (TRAIN while Codex is offline). Branch `claude/grayson-train-standards-001`. Reviewer:
  Grok Bot. **Active PR:** pending.
- **Order and overlap:** Claude Code **#3** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after RUN-CUES-001. It also needs
  GRAYSON-TRAIN-RUN-001 (which adds the running table and history; #666) and
  GRAYSON-TRAIN-EDIT-001 (corrections model). This brief touches `application/trainProgress.ts`,
  `trainProgressQueries.ts`, `ui/screens/train/TrainProgress.tsx` and `domain/common/types.ts`. Recheck open PRs at
  build time; tracker to the oldest open PR.
- **Change to RUN-001's note:** RUN-001 said B4 would add `kind: "TIMED_TEST"` to the running table. This brief
  records all three tests the same way instead, as one event, so they share one history and sit-and-reach (which
  isn't a run) fits. If RUN-001 has already shipped a `TIMED_TEST` kind, stop and ask.

## Objective and benefit
TRAIN's Progress shows four standards, and three can't be recorded: "Sit-and-reach: BEYOND doesn't record this test
yet", "1.5-mile run: BEYOND doesn't record a timed run yet", and one-minute sit-ups shows only a practice set,
"Practice isn't a timed test" (`application/trainProgress.ts:65-74`). After this he can record each test in a
few taps, see his last and previous results and their dates, and set his own target.

**Benchmark (read 2026-11-24):** the Illinois POWER test runs these events in order: sit-and-reach (inches, shoes
off, knees straight), one-minute sit-ups (heels held, fingers behind the head, elbows to knees), a one-rep bench
press scored against bodyweight, and the 1.5-mile run for time
([Public Safety Testing, Illinois officer physical](https://publicsafetytesting.com/information-center/test-requirements-law-enforcement-officer-physical-il)).
Standards differ by age and sex and were revised in December 2022
([Sauk Valley CC, POWER test information](https://svcc.edu/community/police-academy/_forms/PowerTestInformation.pdf)).
That these are his four standards is inferred from the Progress panel; he confirms with the device check.
Hevy times a set with an inline stopwatch ([Hevy, workout settings](https://www.hevyapp.com/features/workout-settings/);
Scorecards H5). **What we copy:** the event list, units, and a timer while doing a timed set. **What we keep out:**
any score chart; his target is his own.

## Recommended defaults (approved when Gavin merges this brief)
1. **One event,** `STANDARD_TEST_RECORDED`: `{ test: "SIT_AND_REACH" | "SIT_UPS_1MIN" | "RUN_1_5_MILE", value,
   unit: "in" | "reps" | "seconds", at, beyondDayId, note? }`. Voidable through the existing void readers
   (FIX-UNDO-001), with a fix that voids and re-records (Undo shows after a fix or a removal, per his Nov 24 pick).
2. **Record from TRAIN → Progress → STANDARDS:** each of the three rows gets RECORD. The sheet takes:
   - Sit-and-reach: inches, to a quarter inch.
   - One-minute sit-ups: reps, with an optional START 1:00 timer that counts down and buzzes once at zero
     (screen on; reuse `src/ui/feel/feedback.ts` as REST-001 does). The timer writes nothing.
   - 1.5-mile run: minutes and seconds, typed. Optional START STOPWATCH while the sheet is open (screen on), which
     fills the time when he taps STOP. No GPS, no distance tracking.
   - When: now by default, changeable within the lived day's rules (`logTimes.ts`), and an optional note.
3. **Each row then shows:** last result and date, the one before it and its date, and the change in plain words
   ("1 inch further than Oct 2"). Nothing red; a slower run reads "18 seconds slower than Oct 2".
4. **Practice stays practice:** sit-up practice sets keep showing as practice and are never counted as a test.
5. **Bench** stays as today (observed from his sets), unchanged.
6. **History:** RECORDS in the row opens every result for that test, newest first, each fixable or removable.

## What's editable, and what isn't yet
- **Editable:** every recorded result (value, time, note) and removing one; a target per test (blank by default,
  "Target: 13:30, set by you"), stored in his settings (`beyond.standardTargets.v1`, in `TRAVELLING_SETTINGS` as
  "Standards targets"). With a target, the row adds "13 seconds under your target" or "22 seconds to go"; never
  pass or fail.
- **Not editable yet:** which tests exist.

## Design principles check (Vision, Nov 24)
- **Yours to change:** results, targets, removal.
- **Fix, don't ask:** RECORD goes straight to the sheet.
- **One tap for the usual:** RECORD, value, SAVE.
- **Built around shift:** any time, placed in the lived day.
- **Calm:** no red, no pass/fail, no streaks, no charts of other people.
- **Always says why:** each row says what changed against what and when.
- **Simple first:** three tests, typed values, optional timers.
- **Tap or say it:** Delta logging of tests is out of scope for now.

## Scope
- `domain/common/types.ts`: the event type and payload; `domain/workout/standardTests.ts` (new): validation, units.
- `application/standardTestCommands.ts` and `standardTestQueries.ts` (new); `trainProgress.ts` and
  `trainProgressQueries.ts`: the three rows read real results.
- `ui/screens/train/StandardTestSheet.tsx` (new), `TrainProgress.tsx`: RECORD, RECORDS, targets.
- `persistence/settingsTransfer.ts`: one entry. Backups already carry events.

## Excluded
- No bench test flow; no GPS or distance; no score tables or pass/fail; no Delta tool; no reminders to test; no
  change to running sessions.

## Files
- **In scope:** the files under Scope, tests, screenshots.
- **Off limits:** `persistence/db.ts` (no new version), the running table, Engine, Health Bridge, `bridgePlan.ts`.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** the void readers and Undo (`useUndoWindow`); `logTimes.ts`; `feedback.ts`; the Progress panel and its
  evidence words.
- **OWN:** the event and its reads.
- **BUILD FROM SCRATCH:** the sheet and the two small timers.

## Acceptance
- `tests/standardTests.test.ts` (pure and integration, `TZ=UTC` and `TZ=America/Chicago`): validation per unit
  (inches 0–30 in quarters, reps 0–150, seconds 300–3600); last and previous come out right; voids drop a result;
  a fix keeps the original voided; a result at 23:30 Central shows that date; practice sets never count; target
  words both ways; no target means no target words.
- `tests/browser/StandardTests.test.tsx`: record each test; the one-minute timer buzzes once at zero and writes
  nothing; the stopwatch fills the time; fix and remove with Undo; targets save and survive a reload; keyboard only;
  axe clean; 320/360/412 px no overflow.
- Existing Progress, TRAIN and void tests stay green. New tests fail on master. `typecheck`, `check:architecture`,
  `check:risk`, build, focused tests in both zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-TRAIN-STANDARDS-001/` at 360 px (key ones 320 and 412): the
  STANDARDS panel with results, the sheet for each test, a row with a target.
- **Device check (Gavin, Android):** record a sit-and-reach and a one-minute sit-up set with the timer; set a target
  for the run. Confirm these are the standards you train for. Then KEEP / REFINE / RETHINK.

## Decision record
`docs/decisions/GRAYSON-TRAIN-STANDARDS-001.md`: one event for all three tests (replacing RUN-001's TIMED_TEST note),
no score charts, targets his own.

## Stop and ask Gavin if
- RUN-001 already shipped a `TIMED_TEST` kind.
- His standards turn out to be different tests or units than these three.

## Risks and checks
- **Wrong standards:** inferred from the Progress panel; the device check asks him.
- **Timers in a sheet:** screen-on only, as REST-001; a closed sheet stops the timer and keeps nothing.
