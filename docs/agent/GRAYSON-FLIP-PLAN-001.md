# GRAYSON-FLIP-PLAN-001 — the rotation flip: a short sleep, then daylight, then a normal night (and the way back)

- **Authorization:** Gavin, 2026-11-24. Backlog row **C2.4** (CONNECT, ranked 12th): "Plan for a rotation flip, before
  and after". At 05:03 CT: **"Yes. Start the next briefs"**; at 05:23 CT: **"Just keep pumping out work."** His rule:
  **"I should be able to edit and tweak or correct everything in this app."** Merging this brief approves the defaults
  below.
- **Lane: PROTECTED.** It adds cards to the shift sleep plan (CIRCADIAN-SPIKE-001's protected surface), a line in
  TODAY's operating-state band, and two settings on the `schedulePatterns` "current" row next to the caffeine cut-off.
  No new table, event, Dexie version, Engine input, recommendation change or notification.
- **Starting commit:** `origin/master` `92f46cf3` (#667). Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225` (Grok Bot ran out of usage; Gavin moved its queue,
  2026-11-25). Branch `ccr-380c4225-flip-plan`, or the branch name its session allows. **Reviewer:** a fresh-context
  reviewer.
  **Active PR:** pending.
- **Order and overlap:** Delta-track session **#3** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after SHIFTDOWN-TAPS-001. PLAN-FRESH-001 is
  built before this now; make sure the flip-day plan reaches the phone through its hand-off. Shares `TodayScreen.tsx` only through
  `LifeStateBand`'s props; touches `application/shiftSleepPlan.ts`, `application/sleepPlanSettings.ts` and
  `persistence/sleepPlanSettingsValidation.ts`, which no queued brief changes. Rebase on whichever merges first.

## Objective and benefit
GRAYSON already knows when a run ends and starts. TODAY names the moment (`application/lifeTransition.ts`: LAST SHIFT,
RUN OVER, FLIP DAY), and the shift sleep plan in ROUTE gives a caffeine cut-off, a pre-shift nap, "sleep soon after
this shift" and "light on the way home" (`application/shiftSleepPlan.ts`). What's missing is the part between: how to
get from nights back to days after the last shift, and from days back to nights before the first one. Gavin's
two-week rotation flips four times (Week A: Mon, Tue, then Fri to Sun; Week B: Wed, Thu), so this happens most weeks.
After this, on those days GRAYSON says the whole plan in one line: when to get up, when to get daylight, when to go to
bed.

**Benchmark and evidence:**
- Timeshifter's shift-work app builds its plan around light timing: "Light is the most important time cue for
  shifting your circadian clock, so try your best to follow the light exposure and light avoidance advice"
  ([Timeshifter: How to timeshift](https://timeshifter.com/the-shift-work-app/how-to-timeshift), read 2026-11-24;
  [The science of shift work disorder](https://timeshifter.com/shift-work/the-science-of-shift-work-disorder),
  updated 2026-10-17, read 2026-11-24). We copy the idea of a timed light step, not its model or numbers.
- NIOSH's shift-work training for nurses warns against both all-nighters around a flip: "after your last night shift,
  you might be tempted to stay up the entire next day and then go to bed at night", which means "you will be awake for
  too many hours"; and "You may be tempted to stay up all day before your first night shift". It suggests "On days off,
  try to stay up until the middle of the night (3-4 a.m.), and sleep until noon or 1 p.m.", and "If it is possible to
  take a nap before returning to work, do so" ([NIOSH Module 9, Sleep (continued)](https://www.cdc.gov/niosh/work-hour-training-for-nurses/longhours/mod9/06.html);
  [Module 9, Sleep](https://www.cdc.gov/niosh/work-hour-training-for-nurses/longhours/mod9/05.html), read
  2026-11-24). NIOSH gives no single rule for the exact wake-up time; that number is his to set (default below).
- His own records come first wherever GRAYSON has them: usual days-off bedtime from Garmin (`engine/sleepRhythm.ts`,
  the OFF group), and his first sleep after past runs (`rotationProjection.ts`), as the existing cards already do.

## Recommended defaults (approved when Gavin merges this brief)
1. **Two plans, chosen by the length of the break:**
   - **Flip back (3 or more days off):** after the last night of the run, a short sleep, then daylight, then bed at a
     normal time. The aim is one normal night on the first night off.
   - **Stay late (2 days off):** NIOSH's middle ground. Sleep after the shift as usual, then on the days off go to bed
     late (about 03:00) and sleep in (until about 12:00), so going back on nights two days later isn't a second flip.
   His Week A Wed–Thu break and Week B Mon–Tue break are 2 days; Week B's Fri–Sun break is 3 days.
   GRAYSON reads the break length from his saved schedule, so a changed schedule changes the plan with it.
2. **Flip back, the line:** "Sleep soon after this shift and get up by 13:00. Get outside in daylight this afternoon.
   Bed around 22:45, your usual on days off." The bedtime is his Garmin days-off median start; with fewer nights than
   `RHYTHM_MIN_NIGHTS` it says "Bed at your usual night-time." The 13:00 is a default (see settings).
3. **Stay late, the line:** "Two days off. Sleep after this shift, then stay up late on your days off (bed about
   03:00, up about 12:00), so your next night shift isn't a second flip." Times are the defaults; his settings change them.
4. **Back onto nights (the day before the first night of a run, FLIP DAY):** "Tonight, stay up later than usual (about
   01:00) and sleep in. Nap before your 18:00 shift." "About 01:00" is his days-off bedtime plus 2 hours. After a 2-day
   stay-late break he's already late, so the line is just: "Nap before your 18:00 shift." The nap times stay on the
   existing NAP card.
5. **Where it shows:**
   - **TODAY:** one muted line in the operating-state band, under the moment line it belongs to (LAST SHIFT from the
     shift's start until the short sleep's wake-up time, RUN OVER until bedtime, FLIP DAY until the shift starts). One
     line, no button, no red. Tapping it opens ROUTE at the card.
   - **ROUTE:** a new card in the shift sleep plan, "Flip back", "Stay late" or "Back onto nights", with its basis,
     its sources and SAVE/SKIP exactly like the other cards (SAVE adds a planned item, never due).
   - **Lived-day bar:** the existing `windows` get the short sleep (kind SLEEP, basis FLIP) and the afternoon daylight
     (new kind DAYLIGHT, 14:00–16:00 by default), so the bar on TODAY matches the line.
6. **The card stays after the shift ends:** today the plan looks only at a shift under way or within 24 h, so it
   disappears at 06:00. The flip card is derived separately and stays from the start of the last shift until the
   first normal night's bedtime (flip back) or the shift's end plus 12 h (stay late), and from 16:30 on FLIP DAY until
   the first night's start (back onto nights).
7. **Never an input:** read only, like the rest of the plan. Not used by the Engine, recommendations, Delta or the
   workout choice. It never says whether he did it: GRAYSON records no light.

## Everything is his to change
In ROUTE, the card's **CHANGE** (the same pattern as the caffeine cut-off's CHANGE, with SAVE and UNDO):
- **Show flip plans** on or off (default on).
- **Get up by** after the last night: 11:00 to 15:00 in 15-minute steps (default 13:00; NIOSH's "sleep until noon or 1
  p.m.").
- **Which plan for a 2-day break:** Stay late (default) or Flip back.
- **Which plan for 3 or more days off:** Flip back (default) or Stay late.
- **Stay-late bed and wake:** default 03:00 and 12:00 (NIOSH's "3-4 a.m." and "noon or 1 p.m.").
- **Later the night before nights:** 0 to 3 hours later than his usual (default 2).
- **Daylight window:** start and length (default 14:00, 2 hours).

Stored as `flip` beside `caffeineCutoff` in `sleepPlanSettings` on the `schedulePatterns` "current" row, so native
backups carry it and no schema change is needed. **Fix needed:** `writeSettings` in `application/sleepPlanSettings.ts`
drops the whole `sleepPlanSettings` object when there's no caffeine cut-off; it must keep it when either part is set.
Each value says whether it's the default or his own, like the cut-off's "(your setting)".

## Design principles check (Vision, Nov 24)
- **Yours to change:** every time and both plan choices are his; the card can be turned off.
- **Fix, don't ask:** nothing to answer; the plan just shows on the days it matters.
- **One tap for the usual:** nothing to tap; SAVE is one tap if he wants it on PLANS.
- **Built around shift:** it follows his saved rotation and his lived day.
- **Calm:** one muted line, no alerts, no score, no "you missed it".
- **Always says why:** the card says the break length, which numbers are his and the sources.
- **Simple first:** one line on TODAY; the detail is in ROUTE.
- **Tap or say it:** Delta can already answer "when should I sleep after my last shift?" from ROUTE's card; no change.

## Scope
- `application/shiftSleepPlan.ts`: `deriveFlipPlan({ now, pattern, rhythm, rows, settings })`, pure, returning
  `{ kind: "FLIP_BACK" | "STAY_LATE" | "BACK_ON", card: PlanCard, line: string, windows, showUntil } | null`; new
  `PlanCardKind` values `FLIP_BACK`, `STAY_LATE`, `BACK_ON`; new window kind `DAYLIGHT` and basis `FLIP`;
  `SOURCES.NIOSH_FLIP` and `SOURCES.LIGHT_TIMING` with the quotes above; `getShiftSleepPlan` adds the flip card to
  `cards` and its windows to `windows` while it applies.
- `application/sleepPlanSettings.ts` and `persistence/sleepPlanSettingsValidation.ts`: the `flip` settings, its
  validation, SAVE and UNDO, and the `writeSettings` fix.
- `application/lifeTransition.ts` or the TODAY read in `TodayScreen.tsx`: pass the flip line to `LifeStateBand`.
- `ui/screens/today/LifeStateBand.tsx`: the line under the moment.
- `ui/screens/systems/ShiftSleepPlanCards.tsx` and new `ui/screens/systems/FlipSettings.tsx`: the card's CHANGE.
- The lived-day bar's renderer: a DAYLIGHT segment in the existing palette.

## Excluded
- Melatonin, caffeine changes, light boxes, any measured light, notifications, an Engine or recommendation change,
  Delta changes, Elle's schedule (days off with Elle stays its own row and needs her OK), changing the existing cards'
  rules.

## Acceptance
- `tests/flipPlan.test.ts` with his real rotation saved:
  - Week B's Thu night (last of the run, 3 days off): at 05:00 Fri the card is FLIP_BACK with "get up by 13:00" and
    "Bed around" his OFF median; it's still there at 15:00 Fri; gone after that bedtime.
  - Week A's Tue night (2 days off): STAY_LATE, bed 03:00, up 12:00; gone 12 h after the shift ends.
  - Sunday before Week A's Mon night, i.e. FLIP DAY after the 3-day break: BACK_ON says about 01:00 (OFF median + 2 h)
    and "Nap before your 18:00 shift"; after a 2-day stay-late break it says only the nap line.
  - Too few Garmin nights: "Bed at your usual night-time"; "about 01:00" becomes "a couple of hours later than usual".
  - Each setting changes the right number; the break-length choices swap the plans; off hides everything.
  - No saved schedule: null.
  - Run under `TZ=UTC` and `TZ=America/Chicago`, including the Nov 1 DST change and a shift ending after midnight.
- `tests/sleepPlanSettings.test.ts`: saving `flip` without a cut-off keeps it; saving a cut-off keeps `flip`; UNDO
  restores both; bad values fall back to defaults; backup round-trip keeps both.
- `tests/shiftSleepPlan.test.ts`: the existing cards are unchanged (snapshot the current outputs first).
- Browser tests: TODAY shows the line under LAST SHIFT, RUN OVER and FLIP DAY at the right times and not on other
  days; tapping it opens ROUTE at the card; CHANGE, SAVE and UNDO; SKIP hides the card for that run; keyboard only;
  axe clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-FLIP-PLAN-001/` at 360 px (key ones 320 and 412): TODAY's line on
  each of the three days, the ROUTE card, the settings.
- **Device check (Gavin):** the morning after his next last night, the line on TODAY and the card in ROUTE show his
  own bedtime; next FLIP DAY shows the night-before line.

## Decision record
- Two plans by break length: a full flip back for a 2-day break means two flips in three days; NIOSH's middle ground
  avoids that. Which plan he gets for each break length is his setting.
- A wake-up time, not a sleep length: the existing cards prescribe no sleep length because the sources disagree; a
  "get up by" time is the one number that makes the night after work.
- His records first: bedtime and "later than usual" come from his own Garmin days-off sleep, and the defaults are only
  used until there's enough of it.
- Shown on TODAY as one line: the flip is the moment TODAY already names, so the plan goes with it.

## Stop and ask Gavin if
- His saved schedule doesn't produce the four breaks above (2, 2 and 3 days in the two weeks), or the life-state
  moments don't fall on the days named here.
- `LifeStateBand` can't take one more line without pushing the day's next step below the fold at 360 px.
- Any existing card's output changes.

## Risks
- **Health advice:** the card keeps the plan's "Shift-work guidance, not a decision. Not medical advice" line, quotes
  its sources, and makes no promise.
- **Wrong day:** everything comes from his saved schedule; a confirmed schedule exception changes it the same way it
  changes the moments.
- **Too many cards in ROUTE:** the flip card replaces nothing but is shown only on the three flip days.
