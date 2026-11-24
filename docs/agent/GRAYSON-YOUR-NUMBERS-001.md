# GRAYSON-YOUR-NUMBERS-001 — one page for every number GRAYSON uses about him

- **Authorization:** Gavin, 2026-11-24. Backlog row **E9** (YOURS, SHAPE): "Your numbers: one page of the thresholds
  GRAYSON uses about you ... each with its default, your value and a reset" (`/mnt/project-files/grayson/BACKLOG.md`
  row 9). 07:02 CT: **"first the hard pieces that other features plug into."** 07:56 CT: **"Lets knock out the hard
  ones. Do what's best."** His rule: **"I should be able to edit and tweak or correct everything in this app."**
  Merging this brief approves the defaults below.
- **Lane: PROTECTED** (Engine and recommendation thresholds). No new table, no event, no Dexie version. Each slice is
  its own PR: independent exact-head review, green CI, Gavin merges.
- **Starting commit:** `origin/master` `2370d0f4` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branches `claude/grayson-your-numbers-001-a` and `-b`. **Reviewer:** Grok Bot.
- **Order:** Claude Code **#5** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after
  TRAIN-LOCKSCREEN-001. Shares `progression.ts`, `coachCards.ts` and `restMemory.ts` with the TRAIN briefs; rebase on
  whichever merges first.
- **What plugs in later:** E10 (after the same fix three times, Delta offers to change a default) changes a value on
  this page and nowhere else. ASKS-COUNT-001 and the monthly review can link here.

## Objective and benefit
Today the rules GRAYSON uses about him are fixed in code: 6 hours is "short sleep", 3 hard sessions in 4 days turns
the status line amber, 4 sessions without a record means a deload to 90%, a lift is "re-entry" after 14 days, a new
exercise rests 90 s, Delta needs 7 check-ins before it learns. He can't see them, so he can't tell why GRAYSON
said what it said, and he can't fit them to his body.

After this, **MORE · Your numbers** lists every one in plain words: what it does, the default, his value, and
**RESET**. Change one and every place that uses it follows, including the Why text ("Deload: 5 sessions in a row
without a record, your number").

**Benchmark (read 2026-11-24):** Garmin Connect's user settings let a person enter "your normal sleep hours" and
"determine custom heart rate zones" ([Garmin vívosmart 4 manual, User Settings](https://www8.garmin.com/manuals/webhelp/vivosmart4/EN-US/GUID-59039BED-C6BC-4EC5-B682-55B9BF7D98BF.html)).
Hevy lets you "Customize automatic rest timers" ([Hevy on Google Play](https://play.google.com/store/apps/details?id=com.hevy),
read 2026-11-24; Scorecards H24). **What we copy:** the person sets the number the app judges them by. **What we keep
out:** any score built from these numbers.

## Correction to the backlog row
The row says "short sleep is 6 hours, two short nights in a row". In code those are two different rules:
- **Two short nights** (`engine/sleepStreak.ts`, SLEEP-ENGINE-001) means two nights below the low end of **his own
  usual range** for that kind of day, from Weekly's baselines. There is no fixed hour in it. The page shows that
  range as read-only ("from your last 8 weeks") and makes the number of nights editable.
- **6 hours** is used by the "sleep before workout" finding (`engine/findings.ts` `SHORT_SLEEP_MINUTES`) and the
  status line's amber (`application/systemStatus.ts` `AMBER_SLEEP_UNDER_MINUTES`). Both become editable.

## Recommended defaults (approved when Gavin merges this brief)
1. **One registry,** `domain/yourNumbers.ts`: for each number an `id`, label, one plain sentence on what it does, unit,
   default (imported from the existing constant, so the default never drifts), min, max, step, group, and the files
   that read it. The constants stay exported as defaults; tests that use them keep passing.
2. **One store,** `localStorage` `beyond.yourNumbers.v1`: `{ values: { [id]: number }, changes: [{ id, from, to, at }] }`.
   Only his overrides are saved; the last 20 changes are kept. Validated in `persistence/yourNumbersValidation.ts`
   (unknown ids dropped, out-of-range values dropped back to the default, never clamped silently). In
   `TRAVELLING_SETTINGS` as "Your numbers". Configuration, not history, so no DomainEvent, the same choice as the
   caffeine cut-off (`application/sleepPlanSettings.ts`).
3. **One reader,** `application/yourNumbers.ts` `readYourNumbers(): YourNumbers`. Pure Engine functions take the value
   as a parameter that defaults to the constant (`isStalled(history, stallSessions = STALL_SESSIONS)`), so the Engine
   stays pure and deterministic for the same inputs. Application callers pass `readYourNumbers()`.
4. **Copy follows the number.** Text built from a constant at module load (for example `coachCards.ts` `RE_ENTRY`,
   `DELOAD`) becomes a function of the value. When his value differs from the default, the Why line adds ", your
   number".
5. **The page:** MORE · Your numbers, grouped Sleep, Training, Shift and timing, Food, Delta. Each row: label, his
   value with a stepper, "Default 6 h", one sentence on what it does, and **RESET** when changed. **RESET ALL** at the
   bottom asks once. A change saves on tap and shows UNDO only after a reset (his Nov 24 undo pick). A small "Changed
   Nov 24 from 6 h" line under a changed row.
6. **Paired numbers keep their order:** red sleep stays below amber sleep; the stepper stops at the other value and
   says why.

### Slice A — the page, the store, Sleep and Training
| Id | What it does | Default | Range | Read by |
|---|---|---|---|---|
| `shortSleepNights` | Short nights in a row before TRAIN offers the lighter session | 2 | 1–4 | `engine/sleepStreak.ts` |
| `sleepFindingUnder` | Under this, "sleep before workout" counts the night as short | 6 h | 4–8 h, 15 min | `engine/findings.ts` |
| `statusAmberSleepUnder` | Status line turns amber under this much sleep | 6 h | 4–8 h, 15 min | `application/systemStatus.ts` |
| `statusRedSleepUnder` | Status line turns red under this much sleep | 4 h | 2–6 h, 15 min | `application/systemStatus.ts` |
| `hardSessionsForAmber` | Hard sessions that turn the status amber ... | 3 | 2–6 | `application/systemStatus.ts` |
| `hardSessionsWindowDays` | ... within this many days | 4 | 2–10 | `application/systemStatus.ts` |
| `stallSessions` | Sessions in a row without a record before a deload | 4 | 3–8 | `engine/stall.ts`, `findings.ts`, `coachCards.ts` |
| `deloadPercent` | Deload load, as a share of the stalled load | 90% | 80–95%, 5 | `engine/progression.ts` |
| `reEntryDays` | Days away from a lift before it counts as re-entry | 14 | 7–42 | `engine/progression.ts` |
| `reEntryPercent` | Re-entry load, as a share of the last load | 90% | 70–95%, 5 | `engine/progression.ts` |
| `startingRestSeconds` | Rest for an exercise that has no rest of its own yet | 90 s | 30–300 s, 15 | `application/restMemory.ts` |

### Slice B — Shift and timing, Food, Delta
| Id | What it does | Default | Range | Read by |
|---|---|---|---|---|
| `landingMinutes` | How long after a shift ends TODAY treats as "just home" | 45 min | 15–120 | `application/shiftChange.ts` |
| `preflightMinutes` | How long before a shift TODAY starts getting him ready | 90 min | 30–180 | `application/shiftChange.ts` |
| `afterShiftLogMinutes` | What WHEN → AFTER SHIFT means: this long after the shift ends | 60 min | 15–180 | `application/logTimes.ts` |
| `driveMinutes` | His drive home, taken as this long after a shift ends (alertness read) | 60 min | 10–120 | `application/alertness.ts` |
| `trainPrepMinutes` | Time kept free before training in the sleep plan | 120 min | 30–240 | `application/shiftSleepPlan.ts` |
| `trainWindowMinMinutes` | Shortest gap the sleep plan offers for training | 45 min | 20–120 | `application/shiftSleepPlan.ts` |
| `lateTrainingHours` | Training this close to sleep counts as late | 3 h | 1–6 | `application/shiftSleepPlan.ts` |
| `weeklyCalorieStep` | Most a calorie proposal may move his target in a week | 150 kcal | 50–300, 25 | `application/targetProposal.ts` |
| `checkInsBeforeLearning` | Check-ins Delta needs before it suggests anything | 7 | 5–30 | `application/delta.ts` |
| `workoutsBeforeLearning` | Workouts Delta needs before it suggests anything | 3 | 2–12 | `application/delta.ts` |
| `learningOutdatedDays` | Days before a learning is marked out of date | 56 | 28–180 | `engine/learningLifecycle.ts` |

## Already editable elsewhere (the page links to them, it doesn't copy them)
Weigh-in gap on the evening close (`dayClose.ts`, 1–14), caffeine cut-off (`sleepPlanSettings.ts`), rest per exercise
(REST-001), eating window, check-in reminder, standards targets (STANDARDS-001), and the calorie floor (1,500 unless
he set his own, TARGET-PROPOSAL-002). Each shows his value and opens its
own screen, so there is one place to change each number.

## Shown, not editable yet, and why (each row says so in one line)
- **The day turns at 4:30 PM** (`engine/dayRollover.ts`). Moving it regroups every past day in his records, so it
  needs its own brief and a migration check. The row says "Moving this changes every past day, so it isn't editable
  here yet."
- **Main sleep is at least 3 hours** (`sleepRhythm.ts` `MAIN_SLEEP_MIN_MINUTES`). Changing it would re-sort past naps
  and main sleeps.
- **His usual ranges** (Weekly's baselines: last 8 weeks, middle half). Read-only, with today's values.
- **Calorie safety limits:** a proposal never goes more than 1,000 kcal a day below maintenance or 500 above
  (`targetProposal.ts`). These protect "lose weight but keep muscle" and stay fixed unless he asks to change them.

## Everything is his to change
Every row in Slices A and B, each with RESET, plus RESET ALL. The defaults stay in code so a reset is exact.

## Design principles check (Vision, Nov 24)
- **Yours to change:** every rule GRAYSON judges him by, in one place. **Always says why:** each row says what it
  does, and Why lines name "your number". **Simple first:** a stepper and a reset, no formulas. **Calm:** nothing
  new appears on TODAY; changing a number never sends an alert. **Fix, don't ask:** defaults work untouched.

## Scope
- New: `domain/yourNumbers.ts`, `application/yourNumbers.ts`, `persistence/yourNumbersValidation.ts`,
  `ui/screens/more/YourNumbersScreen.tsx` (+ css), a MORE menu row "Your numbers".
- Changed: each file in the "Read by" columns takes the value as a parameter with the constant as its default;
  `settingsTransfer.ts` gains the key.
- Tests: registry defaults equal the constants; validation drops unknown and out-of-range values; each Engine
  function gives today's result with no override and the new result with one; Why copy names "your number"; settings
  round-trip through backup and settings transfer; red stays below amber.

## Excluded
Day turn, main sleep minimum, baselines window, calorie safety limits (above). Any automatic change to a number (that's
E10, and it asks first). No new notification. No TODAY change.

## Acceptance
- Phone check: change "Sessions without a record before a deload" to 5; a lift with 4 stalled sessions no longer
  shows Deload, and with 5 it shows "Deload: 5 sessions in a row without a record, your number".
- Change amber sleep to 5 h; a 5 h 30 m night with no other amber fact no longer shows amber.
- RESET puts back the exact default; RESET ALL clears every override after one ask.
- Settings export and import carry "Your numbers".
- `npm run check:risk` names the Engine files; all existing tests pass unchanged.

## Decision record
- Settings, not events, like the caffeine cut-off: these are his configuration, and a change is not something that
  happened in his day.
- Parameters with constant defaults keep the Engine pure and the old tests valid.
- Calorie safety limits stay fixed because they protect the goal he stated (lose weight, keep muscle).

## Stop and ask Gavin if
- A number in the tables turns out to change a recommendation's kind (not just its timing or size) in a way the row
  doesn't say.
- A threshold is read inside a migration or a backup check.
- Any Engine function can't take the value as a parameter without changing its callers' shape.

## Risks
- **Wide diff:** Slice A touches the Engine; review it alone before Slice B.
- **Old Why text:** saved recommendations keep the words they were made with; only new ones say "your number".
