# GRAYSON-WINDOW-ALERT-001 — one alert when your eating window opens

- **Authorization:** Gavin, 2026-11-24. On the five logging ideas: **"I don't necessarily need #3. But I like the
  rest. I don't want it to be annoying and pester me. Start implementing now."** Then: **"Give it to grok."** This
  brief is idea 4: when his eating window opens, one phone alert, and tapping it opens Delta ready for the first
  meal. His fasting ask: **"adjustable and smart... I want to understand what I'm doing and why."** Merging this
  brief is his approval of the defaults below.
- **Lane: PROTECTED.** A new alert kind and notification delivery (DEV-FLOW-002). No new table, domain event or Dexie
  version; one value added to the `KeyMomentKind` type.
- **Starting commit:** `origin/master` `14616be`. Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-window-alert-001`. **Active PR:** pending. Reviewer: Claude Code (Codex
  is offline), or Gavin picks.
- **Order and overlap:** third of the logging briefs, after GRAYSON-LOG-NUDGE-001 and GRAYSON-CLOSE-GAPS-001. It
  touches `application/bridgePlan.ts`, `application/keyMomentAlerts.ts`, the KEY MOMENT ALERTS settings in
  `ui/components/RecordSheets.tsx`, `src/app/App.tsx` (one launch value) and `domain/common/types.ts` (one union
  member). The other two logging briefs touch none of these. No open PRs on `14616be`. Recheck at build time;
  tracker to the oldest open PR.

## Objective and benefit
The Eating Window (C4.8a #619, C4.8b #623) shows on TODAY but never reaches him when he is not looking. The moment the
window opens is the moment the first meal of the day should be logged, and it is the one point where a push earns
its place. It works only once he turns the Eating Window on (his backup shows it has never been enabled), so until
then this alert never fires.

**Benchmarks (read 2026-11-24):**
- Yazio sends reminders when "Your fasting period starts" and when it "ends"
  ([Yazio help](https://help.yazio.com/hc/en-us/articles/4406890595601-Set-Up-Reminders-in-Yazio)).
- Simple has "Remind me to eat" ahead of the eating window and an "Exactly on time" toggle at the moment the fast
  ends, plus a Do Not Disturb schedule
  ([Simple help](https://simplefastingapp.zendesk.com/hc/en-us/articles/4408491733521-How-to-configure-your-notifications)).

**What we copy:** an alert at the moment the window opens, its own on/off, and quiet hours. **What we do better:** it
follows his day kind (work, recovery, off) and rotation, it is silent on the clock, it never pushes out an alert he
already has, and the tap opens Delta to log the meal rather than a timer screen.

## Recommended defaults (approved when Gavin merges this brief)
1. **New kind** `"WINDOW_OPEN"` in `KeyMomentKind` (11 characters; Health Bridge `Moments.kt` takes any kind up to
   20, so no APK change is expected).
2. **When:** for each lived day in the plan's 28-day horizon, when the Eating Window settings are enabled, one moment
   at `plannedOpening(livedStart, opensAt[dayKind])`. The day kind comes from the same rotation the plan already
   reads, mapped as `dayKindFor` does (WORK_RUN → WORK, RECOVERY → RECOVERY, FREE or FLIP → OFF), using whatever
   `application/lifeState.ts` uses to name a future lived day's state. A day whose kind can't be named gets no
   moment.
3. **Words:** title "Eating window open"; text "Your window is open until 12:00 AM. Tap to tell Delta your first
   meal." The close time is opening + eating hours.
4. **Tap:** opens BEYOND on `?alfred=meal`, which prefills Delta with "I ate " and sends nothing (beside the existing
   `?alfred=debrief` in `src/app/App.tsx`). The moment's `go` is `"?alfred=meal"`.
5. **The contract, unchanged:** the kind obeys the per-kind `off` list, quiet hours, the on-the-clock drop and
   `MAX_PER_DAY = 3`.
6. **Priority: last.** `KIND_PRIORITY` becomes `["BEFORE_SHIFT", "SHIFT_DONE", "TASK_DUE", "WAKE", "WINDOW_OPEN"]`,
   so it never pushes out an alert he already gets. On a work day that already has three, it is dropped, and TODAY's
   Eating Window card and the LOG-NUDGE line still cover it. Say this in the settings row: "Lowest priority: on a day
   with three other alerts, this one waits."
7. **Once a day at most,** by construction (one moment per lived day).
8. **Skips and marks:** a moment is planned ahead, so a SKIP TODAY or an early OPENED mark only clears it once the
   plan is next synced. If the plan is rebuilt on TODAY's refresh already, drop the moment for a day that is skipped
   or already OPENED; if not, leave it and note it in the decision record.

## What's editable, and what isn't yet
- **Editable:** "Eating window opens" appears as its own row in KEY MOMENT ALERTS with the existing on/off, default
  **on** (it only fires when the Eating Window itself is on). The opening times and eating hours are already his,
  in the Eating Window setup.
- **Not editable yet:** a heads-up before the window opens, and a "window closes" alert. Both left out to keep it to
  one alert, per "I don't want it to be annoying and pester me."

## Design principles check (Vision, Nov 24)
- **Yours to change:** its own switch; the times are already his.
- **Fix, don't ask:** the tap opens the fix.
- **One tap for the usual:** one tap to Delta.
- **Built around shift:** day kind from the rotation; silent on the clock.
- **Calm:** one a day at most, lowest priority, quiet hours respected.
- **Always says why:** the text names the window and when it closes.
- **Simple first:** one kind, no new screen.
- **Tap or say it:** Delta takes it in words.

## Scope
- `domain/common/types.ts`: add `"WINDOW_OPEN"` to `KeyMomentKind`.
- `application/bridgePlan.ts`: window moments in `planCandidates`; `KIND_PRIORITY`; the label used by
  `describeReminderAlert` or the settings list if kinds are listed there.
- `application/keyMomentAlerts.ts`: accept the new kind in `off` (validation).
- `ui/components/RecordSheets.tsx`: the settings row.
- `src/app/App.tsx`: `?alfred=meal` opens Delta with "I ate ".

## Excluded
- No change to Health Bridge (Android) code. No new alert channel.
- No "window closes" or heads-up alerts. No fasting-stage alerts.
- No change to the Eating Window's own rules, safety questions or card.

## Files
- **In scope:** the files under Scope, their tests, screenshots.
- **Off limits:** `persistence/db.ts`, `eatingWindow.ts` logic (read only), `TodayNumbers.tsx`, `CloseCard.tsx`,
  Health Bridge.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** `getEatingWindowSettings`, `plannedOpening`, `dayKindFor`; the lived-day state reader in
  `lifeState.ts`; `applyAlertContract`; the `?alfred=` launch pattern.
- **OWN:** the window moments in `planCandidates`.
- **BUILD FROM SCRATCH:** nothing else.

## Acceptance
- `tests/bridgeWindowAlert.test.ts` (pure, `TZ=UTC` and `TZ=America/Chicago`): no moments when the Eating Window is
  off; one per lived day when on, at that day kind's opening time; an opening before 16:30 lands in the right lived
  day (`plannedOpening`); text gives the close time; `off` drops it; quiet hours drop it; inside a shift drops it; a
  work day with WAKE, BEFORE_SHIFT and SHIFT_DONE keeps those three and drops WINDOW_OPEN; existing kinds keep their
  order and times; across the November DST change times stay on the wall clock.
- `tests/browser/WindowAlertSetting.test.tsx`: the row shows, toggles and saves; `?alfred=meal` opens Delta with
  "I ate " and sends nothing, then clears the query; keyboard only; axe clean; 320/360/412 px no overflow.
- Existing bridge, reminder and alert tests stay green. New tests fail on master. `typecheck`,
  `check:architecture`, `check:risk`, build, focused tests in both zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-WINDOW-ALERT-001/` at 360 px (key ones 320 and 412): KEY MOMENT
  ALERTS with the new row; Delta opened from `?alfred=meal`.
- **Device check (Gavin, Android):** turn the Eating Window on with an opening a few minutes away on a day off, tap
  SYNC GARMIN so the plan reaches Health Bridge, wait for the alert, tap it and see Delta with "I ate ". Then KEEP /
  REFINE / RETHINK.

## Decision record
`docs/decisions/GRAYSON-WINDOW-ALERT-001.md`: the kind, lowest priority and why, how skips are handled, the benchmarks.

## Stop and ask Gavin if
- Health Bridge turns out to need an APK change for a new kind.
- Lowest priority means it would never fire on any day of his rotation (check his saved pattern: if every day already
  has three alerts, ask whether it should rank above WAKE instead).
- The lived-day state for future days can't be read without a new engine.

## Risks and checks
- **Pestering:** one a day, lowest priority, quiet hours and shifts respected, its own switch, and silent unless he
  turns the Eating Window on.
- **Stale plan:** a skip or a changed opening time reaches the phone only at the next sync; the decision record says
  which.
