# GRAYSON-LOG-NUDGE-001 — a quiet "tell Delta" line beside your steps, at your usual meal times

- **Authorization:** Gavin, 2026-11-24. His problem, in his words: **"I think my big problem is like remembering that
  I need to log stuff... I open the app a lot to see my steps. Maybe if the app had a better way of helping."** Of
  the five ideas offered: **"I think those are all good ideas. I don't necessarily need #3. But I like the rest. I
  don't want it to be annoying and pester me. Start implementing now."** Then: **"Give it to grok."** This brief is
  ideas 1 (a line where he already looks) and 2 (learned usual meal times). Merging it is his approval of the
  defaults below. His standing rule: **"I should be able to edit and tweak or correct everything in this app."**
- **Lane: PROTECTED.** It adds a line to TODAY's AT A GLANCE, which is TODAY composition (DEV-FLOW-002). No new
  table, domain event, Dexie version, notification or alert kind. Reads only; the write is the existing Delta
  meal logging he already uses.
- **Starting commit:** `origin/master` `14616be`. Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-log-nudge-001`. **Active PR:** pending. Reviewer: Codex is offline,
  so Claude Code reviews, or Gavin picks.
- **Order and overlap:** first of three logging briefs (then GRAYSON-CLOSE-GAPS-001, then
  GRAYSON-WINDOW-ALERT-001). Grok Bot's queue already holds GRAYSON-HOME-LASTDONE-001 and GRAYSON-RUN-DEBRIEF-001;
  Gavin's latest ask makes this one next unless he says otherwise. Overlap check on `14616be`: no open PRs.
  HOME-LASTDONE touches Home and `CommitmentQuickActions`, RUN-DEBRIEF touches the run sheet and Delta's debrief
  prefill, neither touches `TodayNumbers.tsx`. Recheck open PRs at build time. Tracker and checkpoint go to the
  oldest open PR (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit
Gavin logs meals by telling Delta what he ate, and he likes that as it is. What fails is remembering: his backup
(Nov 24) shows meals logged on only 28 days, and some of those partly. He opens TODAY many times a day to see his
steps. So the reminder goes where his eyes already are, at the point in his day when he usually eats, and it asks
for one tap that opens Delta with "I ate " already typed.

**Benchmarks (read 2026-11-24):**
- Yazio sets a fixed time for each meal reminder and sends an evening reminder only "If you haven't logged anything
  during the day" ([Yazio help](https://help.yazio.com/hc/en-us/articles/4406890595601-Set-Up-Reminders-in-Yazio)).
- Carb Manager sets "a time for each reminder" for breakfast, lunch, dinner, a snack and a supplement, and turns meal
  reminders "on or off" as a group ([Carb Manager help](https://help.carbmanager.com/en/articles/2645984-setting-meal-reminders)).

**What we copy:** a reminder per meal, a time he can change, one on/off switch, and Yazio's rule that a reminder
appears only when nothing was logged. **What we do better:** the times are learned from when he actually logged on
past days of the same kind (work, recovery, off), because his shifts move his meals; the reminder is a line on
TODAY, not a push; and it never shows when he already logged.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where:** one line directly under the AT A GLANCE tiles in `TodayNumbers.tsx`, in the existing muted style. No
   red, no badge, no count, no icon that moves. At most one line at a time.
2. **When it shows:** all of these are true:
   - now is at least **45 minutes** past one of his usual meal times for today's day kind, and
   - no meal has been logged since **90 minutes** before that usual time, and
   - that usual time has not been answered or dismissed today, and
   - he is not on the clock (TODAY's `scheduledClock.phase` is not `SCHEDULED_SHIFT`, and no started work period is
     open), because the post-shift catch-up (LOG-CATCHUP-001) already covers meals at work, and
   - TODAY is not in operations-only mode.
3. **Words:** "Usually you eat around 2:10 PM. Nothing logged since 12:40 PM. **TELL DELTA**". The first sentence is
   the why (principle "always says why"). With no meal logged yet today: "Usually you eat around 2:10 PM. Nothing
   logged yet today." Times follow the device's 12- or 24-hour clock as the rest of TODAY does.
4. **Tap TELL DELTA:** `askAlfred("I ate ")` (AlfredSheet.tsx), which opens Delta with that text and sends nothing.
   The line hides once any meal is logged after it appeared.
5. **NOT NOW:** a second small text button. It hides that one usual time for the rest of the lived day. Nothing is
   written to history.
6. **Usual meal times (idea 2):** learned per day kind (WORK, RECOVERY, OFF, using `dayKindFor` from
   `application/eatingWindow.ts`) from the times of root `MEAL_LOGGED` events over the last **28 lived days**, with
   voided meals left out (the FIX-UNDO-001 void readers). Group each day's meals into clusters at least **90 minutes**
   apart; a cluster that appears on at least **4 days** of that kind becomes a usual time, at the median minute of the
   lived day. Up to **4** usual times per day kind. Fewer than 4 days of evidence for a kind: no learned times for it,
   so the line falls back to his edited times if he set any, and otherwise does not show. It never invents times
   from typical people.
7. **Shift-time meals** (inside his shift window on past work days) are left out of learning, because the catch-up
   owns them.
8. **One per gap:** after a usual time is answered (a meal logged) or dismissed, the next line can only come from the
   next usual time.

## What's editable, and what isn't yet
- **Editable** in a new "Logging nudge" row in the existing settings where key-moment alerts live
  (`ui/components/RecordSheets.tsx` holds "KEY MOMENT ALERTS"; put the row next to it): on/off (default **on**); the
  delay after the usual time (15–120 min, default 45); and, per day kind, the usual times shown as learned with
  "from your logs, N days" beside each, each of which he can move, delete or add to. An edited time is kept as his
  and wins over the learned one; RESET puts the learned times back.
- Stored in localStorage key `beyond.logNudge.v1` (and the per-day dismissals in `beyond.logNudge.dismissed.v1`,
  which do not travel). Add `beyond.logNudge.v1` to `TRAVELLING_SETTINGS` in `persistence/settingsTransfer.ts` as
  "Logging nudge" so a backup carries it.
- **Not editable yet:** the 28-day look-back and the 4-day evidence floor. They are constants with a comment naming
  this brief.

## Design principles check (Vision, Nov 24)
- **Yours to change:** on/off, delay and every time are his.
- **Fix, don't ask:** the line adds no question of its own; one tap opens what he already uses.
- **One tap for the usual:** TELL DELTA.
- **Built around shift:** learned per day kind; silent on the clock.
- **Calm:** muted, one line, never a push, never red, gone once he logs.
- **Always says why:** "Usually you eat around…" names the reason.
- **Simple first:** no new screen; one row in existing settings.
- **Tap or say it:** the tap opens Delta, where he says it.

## Scope
- `application/logNudge.ts` (new): pure `learnUsualMealTimes(meals, days, settings)` and
  `deriveLogNudge(input, now)`, plus an async `getLogNudge(dayId, now)` that reads meals through existing queries.
- `ui/screens/today/TodayNumbers.tsx`: a `logNudge` prop and the line; TODAY passes it.
- `ui/screens/today/TodayScreen.tsx`: read the nudge alongside the other TODAY reads, refresh on `refreshVersion`.
- The settings row and its storage helper (`ui/screens/today/logNudgeStore.ts`, new, like `closeStore.ts`).
- `persistence/settingsTransfer.ts`: one entry in `TRAVELLING_SETTINGS`.

## Excluded
- No push notification, no Health Bridge moment, no new alert kind (the window alert is GRAYSON-WINDOW-ALERT-001).
- No water, protein, weight or sleep nudges. Meals only. The close-of-day gaps line is GRAYSON-CLOSE-GAPS-001.
- No streaks, no counts of missed meals, no score.
- No change to how Delta logs meals, or to the catch-up card.

## Files
- **In scope:** the files under Scope, their tests, screenshots.
- **Off limits:** `domain/`, `persistence/db.ts` (no Dexie version), `bridgePlan.ts`, `keyMomentAlerts.ts`, Health
  Bridge, `ShiftCatchUpCard.tsx`, `CloseCard.tsx`, Delta's tools.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** `getMealEntries` and the void readers; `dayKindFor`; the lived-day boundary (`logTimes.ts`);
  `livedDayShiftWindow` (as `shiftCatchUp.ts` uses it); `askAlfred`; the `closeStore.ts` storage pattern.
- **OWN:** clustering and the evidence floor in `logNudge.ts`.
- **BUILD FROM SCRATCH:** nothing beyond the line and the settings row.

## Acceptance
- `tests/logNudge.test.ts` (pure, in `TZ=UTC` and `TZ=America/Chicago`): clusters 90 minutes apart; a usual time
  needs 4 days of that kind; voided meals ignored; shift-time meals ignored; an edited time wins and RESET restores;
  no line before usual + delay; no line when a meal was logged inside the 90-minute look-back; no line on the clock;
  no line in operations-only; NOT NOW hides only that time for that lived day; a usual time near the 16:30 boundary
  stays in its own lived day; fewer than 4 days and no edited times means no line.
- `tests/browser/LogNudge.test.tsx`: the line appears with its reason; TELL DELTA opens Delta with "I ate " and sends
  nothing; logging a meal hides it; NOT NOW hides it; the settings row turns it off and edits a time; keyboard only;
  axe clean; 320/360/412 px no overflow.
- Existing TODAY, catch-up, close and eating-window tests stay green. New tests fail on master. `typecheck`,
  `check:architecture`, `check:risk`, build, focused tests in both zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-LOG-NUDGE-001/` at 360 px (key ones also 320 and 412): the line
  under the tiles, the line with "nothing logged yet today", the settings row with learned times.
- **Device check (Gavin, Android):** on a day off, wait past a usual meal time without logging; see the line under
  your steps; tap TELL DELTA and log; see it go. Then KEEP / REFINE / RETHINK.

## Decision record
`docs/decisions/GRAYSON-LOG-NUDGE-001.md`: the defaults above, why it is an in-app line and not a push ("I don't want
it to be annoying and pester me"), and the benchmarks.

## Stop and ask Gavin if
- His logs give no usual times for any day kind (fewer than 4 days each), so the line would never show without him
  entering times. Ship it anyway with the empty state "Not enough meals logged to learn your times yet. Add one?",
  and say so in the PR.
- The line would need to push any existing TODAY section down past the first screen at 360 px.
- Anything seems to need a push notification or an alert kind.

## Risks and checks
- **Pestering:** one line, once per usual time, NOT NOW, an off switch, and nothing while on the clock. If the
  device check says it nags, the first lever is the delay, then fewer usual times.
- **Wrong times:** early on his evidence is thin; the 4-day floor and "from your logs, N days" keep it honest.
- **Time zones:** usual times are minutes into the lived day, not wall clock, so a DST change does not shift them by
  an hour; test both zones.
