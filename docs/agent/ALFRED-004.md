# ALFRED-004 — Alfred remembers, reads the whole history, talks back, and plans

- **Authority:** Gavin, 2026-10-31: "I like all of the ideas. Let's start implementing them… reuse
  other people's code… Keep it simple and move quickly. Make it so" (the fifteen ideas offered that
  night). This covers all fifteen ideas.
- **Builder / lane:** Claude Code; Protected within the owner's go. One additive table (schema v16,
  `alfredMemories`); new Alfred tools over existing commands. Branch `ccr-0be4f40f-16m0ja`.

## What it does

- **#1 Alfred remembers.** "Remember…" becomes a card; SAVE keeps the fact (people, money, health,
  home, work). Every answer reads them. MEMORY in the sheet lists them, each with Forget. They live
  in BEYOND's own database, so backups carry them.
- **#2 Talk mode.** "Speak answers" reads Alfred's replies aloud with the phone's own voice
  (`speechSynthesis`); with it on, a spoken message sends itself when you stop talking.
- **#3 Debrief.** DEBRIEF MY SHIFT listens, sends, and Alfred proposes every record in it as its own
  card (meals, check-in, urges, reminders, notes), then a two-line read of the shift. New card: log an urge.
- **#4 "When did I last…?"** Alfred calls `search_records` over the whole history (events, tasks,
  notes, workouts and sets, remembered facts) and answers from what it returns.
- **#5 "Did this work for me?" / #6 Weekly review.** `get_days` reads any period's lived days; the
  weekly review starter compares the last 7 against the 7 before, citing how many days each figure rests on.
- **#7 Flip planner, #8 meal plan + grocery list.** Starters; plans are suggestions, and the parts he
  keeps become reminders or a note.
- **#14 Life admin, #15 people.** Bills and birthdays are remembered facts plus a repeating reminder.

- **#9 MONTH (MONTH-001).** A new MONTH view in DATA's cave: a seven-column calendar of lived days with
  each day's shift (red top line), sleep (underlined red under 7 h), protein, training ▲ and clean ✓.
  Tap a day for its numbers. `application/monthQueries.ts`.
- **#10 Sleep owed.** Over the last 7 days with sleep logged, against the 7-hour adult guideline
  (AASM / Sleep Research Society). Shown on MONTH and in Alfred's records.
- **#11 "Ask about this".** `askAlfred(question)` opens Alfred anywhere with the question ready: ASK
  ALFRED ABOUT THIS DAY on MONTH, ASK ALFRED on every VITALS reading.

- **#12 Alfred speaks first, #13 home-screen widget (BRIDGE-MOMENTS-001, Health Bridge 0.9.0).**
  SYNC GARMIN hands the Bridge this week's key moments (3 hours before each shift, 30 minutes
  before, the end) and Alfred's brief (`application/bridgePlan.ts`). The Bridge sets an alarm per
  moment and posts a notification that opens BEYOND; "Shift's done" opens Alfred's debrief
  (`?alfred=debrief`). Its widget shows the brief and the next moment. Native, so it works with
  BEYOND closed; no server, no Internet permission in the Bridge.

Read tools run on their own (a few rounds at most) and never write; every write is still a card.

## Leverage

- **REUSE:** Anthropic tool use (client tools in a short loop); the browser's Web Speech API for
  listening and speaking; Dexie's additive versioning; BEYOND's day ledger and commands.
- **OWN:** the memory table and its tools, the history search, the prompts.
- **BUILD FROM SCRATCH:** none.

## Tests

`tests/browser/Alfred004.test.tsx`: remember → SAVE → in the records → Forget (axe); search_records
runs in the loop and its result reaches Alfred; search and get_days read stored records only;
starters and Speak answers. `tests/browser/Month001.test.tsx`: sleep owed, a day's numbers, axe, and
"ask about this" opening Alfred with the question. `tests/integration/bridgePlan.test.ts` and the
Bridge's `MomentsTest.kt` (plan parsing, only BEYOND's address opens). Schema migration tests cover v16.
