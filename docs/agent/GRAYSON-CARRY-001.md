# GRAYSON-CARRY-001 — what you didn't get to: carry it, unplan it or mark it done at the close

- **Authorization:** Gavin, 2026-11-24. Backlog row **B6** (SHAPE, ranked 10th): "Carry or drop unfinished plans at
  the close". At 05:03 CT: **"Yes. Start the next briefs"**. His rule: **"I should be able to edit and tweak or correct
  everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** It changes the close shown on TODAY after SHIFT DOWN (TODAY composition, the same lane
  CLOSE-GAPS-001 used) and lets `modifyObligation` clear a planned day. No new table, event, Dexie version, Engine or
  notification.
- **Starting commit:** `origin/master` `fed6b84` (#662). Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-carry-001`. **Reviewer:** Claude Code (Codex is offline).
  **Active PR:** pending.
- **Order and overlap:** Grok Bot **#6** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after TODAY-SPLIT-003, TODAY-CALM-001,
  PLAN-FRESH-001, DICTATE-001 and WORK-RECORD-001. CLOSE-GAPS-001 (#667) is merged and adds a line at the top of `CloseCard`. This brief
  adds its block under that line. Shares `CloseCard.tsx` and `application/dayClose.ts`; rebase on whichever merges
  first. Tracker to the oldest open PR.

## Objective and benefit
Today a task he planned for a day and didn't finish quietly disappears. PLANS' **Today** list shows only tasks planned
for today's date or due by it, **Next 7** only later dates, and **No date** only tasks with neither
(`application/planTodayQueries.ts` `getTaskSmartLists`). A task planned for yesterday with no due date is in none of
them. After this, nothing he planned can vanish: the close names what he didn't get to and offers one tap each, and
PLANS keeps showing anything still planned for an earlier day.

**Benchmark:** Sunsama's shutdown shows "what you didn't get to", and "All tasks automatically roll over to the next
day's task list if they are left incomplete at midnight"
([Sunsama help: daily highlights and shutdown](https://help.sunsama.com/docs/usage-guides/daily-highlights);
[Sunsama help: task rollover](https://help.sunsama.com/docs/getting-started/basics/task-rollover-and-recurring-tasks-the-basics),
read 2026-11-24; SCORECARDS row T6). GRAYSON copies the "nothing is lost" part. It doesn't rewrite his plan by
itself: the vision's "Yours to change" and the anti-goal of an autonomous manager mean a move happens only on his tap.

## Recommended defaults (approved when Gavin merges this brief)
1. **Which tasks:** open, eligible tasks (`getCurrentlyEligibleUnresolvedObligations`) whose `plannedAt` is on or
   before the **first date of the lived day being closed**, and no more than 7 days back. Lived days start at 16:30,
   so a work night Monday 16:30 to Tuesday 16:30 closes Monday's plans. A task only due (no planned day) is left out:
   due dates already show in Today.
2. **Where:** in the close after SHIFT DOWN, under CLOSE-GAPS-001's line, a block headed "Didn't get to (2)". Up to 5
   rows, oldest planned first, then "and 3 more in PLANS". Nothing shows when there's nothing unfinished.
3. **One row each:** the task's title, then three buttons:
   - **NEXT DAY:** plans it for the second date of the closing lived day (Tuesday in the example), through the existing
     `moveWeekTask`, so the original due date and repeat stay as they are.
   - **NO DAY:** clears the planned day; the task moves to **No date**. Needs the small change in default 6.
   - **DONE:** marks it done through `satisfyObligation`.
   Each tap shows **UNDO** on that row until the close is finished.
4. **Leaving it alone is fine:** SKIP or SAVE TO NOTE on the close, or ignoring the block, changes no task.
5. **PLANS never loses one:** the **Today** list gets a short group at its foot, "Planned earlier", for open tasks
   whose planned day has passed (up to 7 days back), each showing its day ("Mon"). Older than 7 days, they show under
   **No date** with "planned Nov 14". Display only; no data changes.
6. **Clearing a planned day:** `obligationModifyInputSchema` takes `plannedAt: null` to remove it, the same pattern as
   `remindAt` and `estimateMinutes` ("null removes"), and `modifyObligation` drops the field. Guarded like
   `moveWeekTask`: a task that changed or closed since the close opened is refused with "This task changed. Open PLANS
   to see it."

## Everything is his to change
- Every row is his tap; UNDO on each until he finishes the close.
- **Show "Didn't get to" at the close** on or off, in the close's existing prompt chooser, stored with the close
  prompts (`ui/screens/today/closeStore.ts`). Default on.
- PICK A DAY isn't in this slice; the week planner already moves any task to any day.

## Design principles check (Vision, Nov 24)
- **Yours to change:** nothing moves unless he taps; undo on every row.
- **Fix, don't ask:** the block is there only when something's unfinished.
- **One tap for the usual:** NEXT DAY.
- **Built around shift:** "next day" means the next date of his lived day, not midnight.
- **Calm:** muted, no red, no count of misses, no streak.
- **Always says why:** each row shows its planned day.
- **Simple first:** three buttons.
- **Tap or say it:** Delta can already move tasks; no change.

## Scope
- `application/dayClose.ts`: `unfinishedPlans(now)` returning the rows for the closing lived day.
- `application/intentCommands.ts` and `persistence/intentValidation.ts`: `plannedAt: null` support.
- `application/planTodayQueries.ts`: `plannedEarlier` in `TaskSmartLists`; older ones annotated in `noDate`.
- `ui/screens/today/CloseCard.tsx`: the block, rows, undo and the chooser switch.
- `ui/screens/more/PlanTodayScreen.tsx`: the "Planned earlier" group.

## Excluded
- Automatic rollover, moving due dates, an archive, any count or score of unfinished work, notifications, Delta
  changes, changes to repeats.

## Acceptance
- `tests/unfinishedPlans.test.ts`: a task planned Monday and open shows at Monday's work-night close at 06:10 Tuesday;
  one planned Tuesday doesn't; one done doesn't; one 8 days back doesn't; NEXT DAY sets Tuesday and keeps `dueAt` and
  `recurrence`; NO DAY clears `plannedAt`; DONE satisfies; UNDO restores the previous planned day; a task edited
  elsewhere is refused. Run under `TZ=UTC` and `TZ=America/Chicago`, including a close after midnight and a
  day-off close at 22:00.
- `tests/intentValidation.test.ts`: `plannedAt: null` accepted and clears it; a bad date still refused.
- `tests/planTodayQueries.test.ts`: a past-planned open task appears in `plannedEarlier`; older than 7 days appears in
  `noDate` with its day; nothing appears twice.
- Browser tests: close with two unfinished tasks; each button and UNDO; the switch hides the block; PLANS shows
  "Planned earlier"; keyboard only; axe clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-CARRY-001/` at 360 px (key ones 320 and 412).
- **Device check (Gavin):** plan a task for tonight, don't do it, SHIFT DOWN in the morning, tap NEXT DAY, and see it
  in tomorrow's Today list.

## Decision record
- Show, don't move: nothing rolls over by itself, but nothing can disappear either.
- "Next day" follows his lived day, because a 06:00 close belongs to the night before.
- Clearing a planned day reuses the "null removes" pattern already in the schema.

## Stop and ask Gavin if
- CLOSE-GAPS-001 isn't merged, or its line already fills the close at 320 px.
- `satisfyObligation` on a repeating task does something other than complete this occurrence.
- Clearing `plannedAt` needs anything beyond the schema's "null removes" pattern.

## Risks
- **A long list at the close:** capped at 5 rows with a link to the rest.
- **Repeating tasks:** NEXT DAY moves only planned attention through `moveWeekTask`; the repeat rule stays.
