# GRAYSON-STARTER-HABITS-001 — one-tap starters in Add a habit, including drink-free days

- **Authorization:** Gavin, 2026-11-25. At 8:41 PM CT: **"I was just looking at the NHS apps. I think they have a lot
  of good things we could add to the Project... Weight loss, stop smoking, getting active and the stop drinking
  app."** Then: **"Those are all fantastic ideas. I think they are all worth using."** At 8:48 PM CT he said **"Yes"**
  to four briefs, with drink-free days as a small add-on to habits. His rule: **"I should be able to edit and tweak or
  correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: FEATURE** (one form in the habits panel; it saves through the existing `createHabit`). No new event,
  table, Dexie version, Engine or Delta change. Green CI and a fresh-context reviewer's PASS; self-merge allowed under
  the Nov 19 charter.
- **Starting commit:** `origin/master` `f8762f93` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-starter-habits-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#17** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It shares no files
  with the rows before it, so it can go whenever the next one waits on a merge. E5 (rename a habit, change its
  schedule) is a later brief and doesn't block this.

## Objective and benefit
Drink-free days already work in GRAYSON: a habit can be "Times a week" (1 to 6, `domain/habits.ts`), YOUR LIFE shows
the week's count beside it, and each day is DONE, NOT DONE or unrecorded with 28 days of history to correct
(`ui/components/HabitsPanel.tsx`). What's missing is knowing that, and the typing: the form starts empty with the
placeholder "Evening walk".

After this, **Add a habit** opens with a short row of **starters**. One tap fills the name and schedule, he can change
either, and SAVE HABIT saves it as today. Nothing is created by a tap on a starter.

**Benchmark (read 2026-11-25):** NHS Drink Free Days: "simply pledge and nominate a specific number of drink free days
each week", and "Health guidelines recommend we all take at least 3 days off drinking a week"
([App Store, NHS Drink Free Days](https://apps.apple.com/gb/app/nhs-drink-free-days/id1196694906), version 4.4.0).
**What we copy:** pledging a number of drink-free days a week, with 3 as the starting number. **What we add:** it's
one of his habits, so it shares the week count, history and corrections he already has. **What we keep out:** badges,
streaks, money or calorie claims (the NHS page doesn't quantify them either), and reminders (habits have none today).

## Recommended defaults (approved when Gavin merges this brief)
1. **Starters,** as chips above the name field, in this order:
   - **Drink-free day** · Times a week · 3
   - **Evening walk** · Any day
   - **Stretch** · Days off
   - **Lights out on time** · Work days
2. **A tap fills, never saves:** it sets the name, the "When" choice and the count, and moves focus to the name field.
   He can change all three. SAVE HABIT saves through `createHabit` exactly as a typed habit does.
3. **The Drink-free day line:** when that starter fills the form, one line under the count says "The NHS suggests at
   least 3 days off drinking a week." with nothing else to tap.
4. **Already have it:** a starter whose name matches an active habit (ignoring case) is hidden. A put-away habit with
   that name doesn't hide it.
5. **Nothing assumes:** starters are general, shown to anyone, and none is ever suggested on TODAY, by Delta or by the
   review. No starter says why he might want it beyond the one NHS line.

## Everything is his to change
Every field before saving; hiding the starters row (one switch at the bottom of the form, on by default). After
saving, the habit is his like any other: PUT AWAY today, and rename or reschedule once E5 lands.

## Design principles check (Vision, Nov 24)
- **One tap for the usual:** a starter fills the form. **Yours to change:** every field before saving. **Calm:** only
  in Add a habit. **Simple first:** four starters, no new screen.

## Scope
- `ui/components/HabitsPanel.tsx` (+ css): the starters row, fill behaviour, the hide rule, the NHS line, the switch
  (a device setting in `TRAVELLING_SETTINGS` as "Habit starters").
- Tests: each starter fills name, kind and count; a tap creates nothing; SAVE makes the same habit as typing it would;
  a matching active habit hides its starter and a put-away one doesn't; the switch hides the row; 320 px and axe on
  the form with the row showing.

## Excluded
Units of alcohol, drinks logged, money or calories saved. Reminders. A separate drink-free screen. Changing
`HABIT_PER_WEEK_MAX` (6). Starters anywhere but Add a habit.

## Acceptance
- Phone check: YOUR LIFE · Add a habit shows four starters. Tap **Drink-free day**: the form reads Drink-free day,
  Times a week, 3, with the NHS line. Change it to 4 and SAVE: the habit shows "0 of 4 this week".
- The Drink-free day starter is now gone from the row.

## Decision record
- A starter in the existing habit form, not a new tracker, because the habit already keeps the weekly count, history
  and corrections.
- Fill, never save, so a mis-tap creates nothing.
- Units and money were left out: the NHS app's own description doesn't count them, and they'd mean logging drinks.

## Stop and ask Gavin if
- The habits form isn't the one on YOUR LIFE (a second add-habit form exists elsewhere).

## Risks
- **Assuming habits:** the starters are general and nothing else in the app suggests them.
