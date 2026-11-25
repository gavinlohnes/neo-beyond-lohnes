# GRAYSON-CHALLENGE-LADDER-001 — when a habit keeps slipping, Delta asks before it pushes

- **Authorization:** Gavin, 2026-11-25. "Both are good to go" (C6.6 and C6.7). His answers on the design, the same day:
  - misses: **"Habits only (Recommended)"**;
  - default: **"On, easy off (Recommended)"**;
  - stages: **"Yes, build it (Recommended)"**, meaning ask → name → challenge (only for forgot / didn't feel like it on
    normal-energy days) → examine the plan, with the floors below.
- **Campaign row:** C6.6 "Earned challenge ladder". Done when: deterministic stages with floors; copy reviewed against
  "challenge the plan before the person"; off switch.
- **Lane: PROTECTED** (user wellbeing, a new event type). No Engine change and no change to recommendation priority.
  Needs an independent exact-head review and green CI; **Gavin merges**.
- **Starting commit:** `origin/master` `3b7497e3`.
- **Builder:** Claude Code session `ccr-380c4225`, branch `ccr-380c4225-ladder`.

## Operator benefit
When a habit he chose keeps not happening, Delta asks what got in the way, once. If the answers repeat, Delta names the
pattern in his own words. Only if he agrees, and only if the misses weren't shift, tiredness or the plan, does Delta
push back with dated evidence and a smaller start. After many misses, Delta stops asking and suggests changing the plan.
It never shows more than one line a day, never on a low-energy day, and every step can be turned off.

## What counts and the floors
These live in one place, `LADDER` in `src/domain/habitLadder.ts`.
- **What counts as a miss:** an explicit "Didn't do it" on a day the habit was due. A day with no answer is never a
  miss. Days whose work context is unknown don't count for WORK_DAYS / DAYS_OFF habits, as in the habit calendar.
- **ASK:** 2 misses in 14 days. It asks about the latest unexplained miss from the last 7 days. The choices are:
  Shift or work ran over · Too tired or recovering · Forgot · Didn't feel like it · The plan doesn't fit ·
  Something else · NOT NOW.
- **NAME:** 3 misses in 28 days and at least 2 answers. It names the most common answer as a problem with the plan or
  the moment, never with him, and adds how many misses were work days. It is asked once. The replies are:
  - THAT'S RIGHT;
  - NOT RIGHT (quiet for 14 days, and counting restarts);
  - CHANGE THE PLAN (opens LIFE · Habits; quiet for 14 days).
- **CHALLENGE:** only after THAT'S RIGHT, and only when 3 or more misses were "Forgot" / "Didn't feel like it" on days
  that weren't low-energy, and those outnumber the other answers. It ends "Two minutes counts. Start smaller today?"
  The replies are START SMALLER, NOT RIGHT and NOT NOW. It never appears for shift, tiredness or plan answers.
- **EXAMINE:** 6 misses in 28 days, or a challenge answered twice. It says the plan isn't working as set, and that
  Delta will stop asking either way. The replies are CHANGE THE PLAN and KEEP IT AS IT IS. Either one is quiet for
  14 days, and counting restarts afterwards.
- **What a low-energy day is:** his last check-in that lived day had energy 2 or less, or the day's guidance was
  RECOVER or STABILIZE.
- **Limits across all habits:** at most one ladder line a day; none once he has answered one today; none on a
  low-energy day. When several habits qualify, the one with the most misses shows.

## Off switches
- **For all habits:** TODAY's quiet-line switch "Habit check-ins". The line is `HABIT_LADDER`, placed after REVIEW in
  the default order and counted in the quiet-line budget.
- **For one habit:** "Stop asking about <habit>", with UNDO. It can be turned back on under MORE · Settings · TODAY.
  It is stored in `beyond.habitLadder.v1` and travels with the backup.

## Copy check ("challenge the plan before the person")
- No "discipline", "willpower", "lazy", "commitment", "failure" or streaks.
- Patterns are named as the plan or the moment ("work days leave no room for it", "it slips out of mind").
- The challenge quotes his own words and dates, and offers a smaller start.
- EXAMINE puts it on the plan. Never red.
- Every line has WHY THIS? with the rule and the dated facts (C6.4).

## Leverage gate
- **REUSE:**
  - the habit calendar (`getHabitWorkspace`): due days, answers, work context;
  - effective check-ins and recommendations for low-capacity days;
  - TODAY's quiet-line budget and switches (C9.6);
  - WhyTrace (C6.4);
  - the C6.1 pattern of a global, strict, append-only answer event;
  - settings that travel (C8.1).
- **OWN:** the stages, floors and copy.
- **BUILD FROM SCRATCH:** none.

## Scope
- Domain and application:
  - `src/domain/habitLadder.ts` (pure);
  - `src/application/habitLadder.ts` (query, answer command, per-habit off switch);
  - the `HABIT_LADDER_ANSWERED` event type and its history line;
  - the settings key added to the travelling list.
- UI:
  - `HabitLadderLine.tsx` and its css;
  - TODAY's quiet lines;
  - the TODAY settings label, plus the "turned off" list;
  - LIFE opening at Habits (App → MoreScreen → LifeScreen `tabRequest`).
- Excluded:
  - training, to-dos and declines (C6.5 keeps declines);
  - anything that changes a habit by itself;
  - Engine and recommendations;
  - notifications.

## Acceptance
- Two misses → ASK. Two answers plus a third miss → NAME. THAT'S RIGHT plus three forgot / didn't-feel misses on
  normal days → CHALLENGE. Six misses → EXAMINE.
- No line on a low-energy day, after an answer today, for a habit turned off, or with TODAY's switch off.
- The tests and screenshots (`docs/agent/screenshots/grayson-c6.6/`) are in the PR.
