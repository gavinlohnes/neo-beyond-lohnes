# GRAYSON-HABIT-EDIT-001 — rename a habit, change its schedule, bring one back, and remove a wrong clean day

- **Authorization:** Gavin, 2026-11-24. Backlog row **E5** (YOURS): "Rename a habit or change its schedule; undo a clean
  day" (`/mnt/project-files/grayson/BACKLOG.md` row 5). His rule: **"I should be able to edit and tweak or correct
  everything in this app."** 05:23 CT: **"Just keep pumping out work."** Merging this brief approves the defaults
  below.
- **Lane: PROTECTED** (the backlog said FEATURE; it moves up because it adds stored schedule history to the `habits`
  row and a new removal type to the quit tracker). Optional fields only, no new table, no Dexie version (the `habits`
  indexes `id, status, createdAt` stay). Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `e7160c68` or later. Re-fetch before starting. If STARTER-HABITS-001 is open,
  rebase on it once it merges (both edit `HabitsPanel.tsx`).
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-habit-edit`, or the branch
  name its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#9** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25).

## Objective and benefit
A habit can only be created or put away today (`application/habitCommands.ts`: `createHabit`, `setHabitArchived`).
A typo in its name, or "3 times a week" that should be 4, means putting it away and starting again, which loses its
history. A put-away habit can't be brought back from the screen, though the command exists. And a clean day logged by
mistake in the quit tracker stays forever: `logCleanDay` has no removal, and the clean-day count and milestones
(7, 30, 60, 90, 180, 365) count it.

After this, every habit has **EDIT** (name and schedule), put-away habits can be brought back, and a clean day can be
removed with undo, the same way a meal or a weigh-in is removed today (`domain/logVoids.ts`).

**Benchmark:** none new. This is the Vision's "yours to change" rule applied to habits.

## Recommended defaults (approved when Gavin merges this brief)
1. **EDIT on each habit** (YOUR LIFE · Habits): the same fields as Add a habit (name, when, days, times a week),
   filled with what it is now, and **SAVE CHANGES**. A rename keeps the habit's id, so its history stays. SAVE shows
   **UNDO**, since it's a fix (his Nov 24 undo pick).
2. **Schedule changes don't rewrite the past.** The habit row gains `scheduleHistory?: { from: string; schedule }[]`,
   where `from` is the lived day the schedule started. `habitApplies` for a day uses the schedule in force that day.
   So "Not scheduled" on an old day, and the week counts, read as they did then. A habit saved before this has no
   history and reads its current schedule for every day, as today. A change takes effect from **today's lived day**.
3. **Changing the week mid-week:** a times-a-week change counts this week against the new number ("2 of 4 this
   week"); the week before keeps its old number.
4. **Put away, then back:** under the habits list, a collapsed **Put away (2)** shows each put-away habit with
   **BRING BACK**. Its history comes back with it. Putting one away shows UNDO.
5. **Remove a clean day:** in the quit tracker, today's "Clean day logged" line gets **REMOVE**, and each clean day in
   the tracker's 28-day history can be removed the same way. Removing writes `CLEAN_DAY_VOIDED` (a new member of
   `LOG_VOID_TYPES`, payload `loggedEventId`), shows UNDO, and `LOG_VOID_UNDONE` puts it back. Every reader of
   `CLEAN_DAY_LOGGED` leaves removed ones out: the clean-day count, this month's count, milestones, money saved, the
   day ledger, the timeline, the mirror and the weekly queries.
6. **Quit habit's own name** is already editable in its settings (`saveQuitHabit`); nothing changes there.

## Everything is his to change
Each habit's name and schedule, with undo; whether a habit is active; every clean day, removable with undo.

## Design principles check (Vision, Nov 24)
- **Yours to change:** name, schedule, put away and back, clean days. **Fix, don't ask:** each change saves at once
  with undo. **Always says why:** an old day's "Not scheduled" stays true to the schedule it had. **Simple first:**
  the same form he already knows.

## Scope
- `domain/habits.ts` (`scheduleHistory`), `application/habitCommands.ts` (`updateHabit` with validation shared with
  `createHabit`; undo restores the previous row), `application/habitQueries.ts` (`habitApplies` takes the schedule for
  the day), `ui/components/HabitsPanel.tsx` (+ css: EDIT, Put away list, BRING BACK).
- `domain/logVoids.ts` (`CLEAN_DAY_VOIDED`), `application/quitCommands.ts` (`removeCleanDay`), every
  `CLEAN_DAY_LOGGED` reader (`quitQueries.ts`, `engine/dayLedger.ts`, `timelineQueries.ts`, `mirrorQueries.ts`,
  `weeklyQueries.ts`, `historyCopy.ts`), `ui/screens/body/QuitTracker.tsx`.
- Tests: a rename keeps every past answer; a schedule change leaves past days' applies and week counts as they were
  and changes today on; a habit with no history reads as today; mid-week times-a-week change; UNDO restores the
  previous name and schedule; BRING BACK restores the history; a removed clean day leaves every count, milestone and
  money saved, and its UNDO puts it back; native backup round-trip with schedule history and removed clean days; an
  older backup without them imports; 320 px and axe on the edit form.

## Excluded
Merging two habits. Deleting a habit for good (put away keeps its history). Changing past answers (the 28-day
history already does that). Reminders. Changing `HABIT_PER_WEEK_MAX`.

## Acceptance
- Phone check: EDIT a habit, rename it and change 3 times a week to 4: the history is unchanged, this week reads
  "of 4", last week still "of 3". UNDO puts both back.
- Put a habit away, open Put away, BRING BACK: its history is there.
- Log a clean day, REMOVE it: the clean-day count drops by one. UNDO: it's back.

## Decision record
- Schedule history instead of rewriting, so an old day never changes from "scheduled" to "not scheduled" behind his
  back.
- Clean-day removal uses the same void and put-back pattern as every other log, so History shows both.
- PROTECTED, not FEATURE, because both changes touch stored data.

## Stop and ask Gavin if
- A reader of `CLEAN_DAY_LOGGED` can't apply removals without changing what an Engine rule decides.
- A schedule change would change a past week's count in the weekly review.

## Risks
- **Past drift:** the test that old days read the same before and after a schedule change is the guard.
- **Missed reader:** the list of `CLEAN_DAY_LOGGED` readers above is from master `e7160c68`; the builder greps again.
