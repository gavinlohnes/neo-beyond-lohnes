# HABIT-QUOTA-001 — "N times a week" habits

- **Authorization:** Gavin, 2026-11-18 (owner session, "Approved." to the recommended HABIT-QUOTA-001). That
  approval is the owner product decision that [HARVEST-002](harvest/HARVEST-002.md) (row "Habit quota such as three times
  a week", score 3.4) said this item needed. Scope as recommended: a habit can be "N times a week" next to Any day /
  Chosen days / Work days / Days off; it shows "1 of 3 this week" with no daily pressure and leaves today's list once
  the week is met; Monday-to-Sunday weeks (as the week planner and the existing "this week" count); the existing Done /
  Didn't do it / Not recorded answers; old answers never reinterpreted; Not recorded stays unknown, never a miss; no
  streaks, no new alerts; old backups restore unchanged. Do not merge.
- **Builder:** Claude Code. Branch `ccr-ca6fc619-gqnj7f` from fetched `origin/master` `6a359d01` (#564 merged).
- **Lane: PROTECTED.** A new value in a backed-up domain field (`Habit.schedule`). Independent exact-head review,
  green CI, Gavin merges.
- **Overlap check:** the only open PR, #473 (parked BIG-IDEAS draft), touches no habit code.

## Meaning

- New schedule kind `TIMES_A_WEEK` with `schedule.perWeek` (an integer from 1 to 6; 7 a week is Any day). It is set
  only on that kind; other kinds are stored exactly as before.
- The week is Monday to Sunday of **lived days** (a lived day starts at 16:30 local). Sunday's lived day, which runs
  into Monday morning, belongs to the week before, the same rule the existing "N this week" count uses.
- A quota habit **applies** (is due) on a lived day while fewer than `perWeek` Done answers exist on earlier lived days
  of that week. A day it is Done on always applies, even past the target. Only Done counts: "Didn't do it" and Not
  recorded never fill the week, and nothing is ever written for a day that was not answered.
- Work context is irrelevant to a quota habit (an unknown work day still applies).
- No editing of an existing habit's schedule (there is no edit command today); put away and add again.

## What changes

- `domain/habits.ts`: the kind, `perWeek?`, and the 1-to-6 range.
- `application/habitCommands.ts`: `createHabit` validates the kind and the weekly target.
- `application/habitQueries.ts`: `habitPerWeek`; `habitApplies` takes the earlier Done count; the calendar counts
  Done answers per week; rows carry `perWeek` (null for other kinds); `getHabitToday` reads this week's lived days
  (1 to 7, not 28) and returns `week: { done, target }` for quota habits, `null` otherwise.
- `bodyDashboardQueries.ts` / `BodyDashboard.tsx`: a due quota habit's chip reads "Lift · 1 of 3 this week"; it
  leaves the list once met (unless done today), like a habit not scheduled today.
- `HabitsPanel.tsx`: "Times a week" in When, with "Times each week (Monday to Sunday)" (default 3); the card reads
  "1 of 3 this week · 4 in 4 weeks", and "· Done for this week" once met.

No Dexie version, index, migration, event, command semantic, Engine, Alfred, notification, provider or dependency
change. `HABIT_SET` and the answers are untouched. An older build reading a quota habit would treat it as Chosen days
with no days (never due); it would still restore and keep its records.

## Leverage gate

- **REUSE:** the existing habit schedule, `HABIT_SET` answers and projection, the 28-day lived-day calendar and its
  Monday-start `thisWeek` count (HABIT-RHYTHM-001), `applies` filtering on BODY. Weekly-quota habits are the standard
  pattern in Loop Habit Tracker and similar apps (idea only; HARVEST-002 already recorded licences); no code copied.
- **OWN:** the BEYOND mapping onto lived days and Monday weeks, and "unknown never counts".
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- `tests/integration/habitQuota.test.ts`: due until met then dropped; only Done counts; done-today stays; Monday
  reset with Sunday night in the week before (and Monday morning still Sunday's lived day); unknown work context;
  BODY chips with progress and dropping out; validation (missing, 0, 7, 2.5, unknown kind; no `perWeek` on other
  kinds); unchanged reads for existing habits; backup round-trip of `perWeek`.
- `tests/browser/HabitQuota001.test.tsx`: create 2×/week at 320 px, progress lines, "Done for this week", 44 px
  controls, no overflow, axe, no streak/missed wording.
- Existing habit suites under UTC and America/Chicago. `tests/integration/habits.test.ts`'s weekly-count case used a
  UTC instant that falls in the previous lived day in Chicago (it failed there on master too); it now uses local 17:00.
- Local `TZ=UTC npm run verify`; PR CI on the exact head; independent exact-head review; Gavin merges.

## Limits

- History's oldest days: the 28-day window can start mid-week, so the "Not scheduled" label on those few oldest days
  may not know about Done answers just before the window. Counts shown as "this week" are always complete.
- No schedule editing, no rolling 7-day window, no per-work-run quotas, no Alfred or helper changes, no alerts.
