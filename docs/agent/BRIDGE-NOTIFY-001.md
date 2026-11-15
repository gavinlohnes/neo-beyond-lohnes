# BRIDGE-NOTIFY-001 — key-moment alerts held to the notification contract, and kept on the phone

- **Authorization:** Gavin, 2026-11-15, chose item 1 of the ranked opportunities ("Finish the notification contract
  and get the plan to your phone without a manual sync") as a bounded mission: at most 3 key-moment alerts a day;
  per-kind off switches, quiet hours, and day-off or plan-to-confirm moments where they fit existing kinds; send the
  alert plan through the existing background sync instead of only on SYNC GARMIN; no new alert kinds; no Engine rule
  changes; stay inside `bridgePlan.ts` and the Android alert machinery; full gate; do not merge. It implements
  [BEYOND-4.0](BEYOND-4.0.md) decision 5 for the existing BRIDGE-MOMENTS-001/002 moments.
- **Builder:** Grok Bot. Branch `codex/bridge-notify-001` from fetched `origin/master` `527332ef` (#552 merged).
- **Lane: Protected.** `classify-risk` reports PROTECTED (persistence path, Android permissions surface); semantically
  this touches a persisted settings row that backups carry and how notifications reach the owner. Independent
  exact-head review, green CI; Gavin merges. No schema version, Engine, dependency, permission or provider change.

## What changes

- **The cap and its order** (`applyAlertContract`, `src/application/bridgePlan.ts`). After the switches and quiet hours,
  at most **3 moments per lived day** (BEYOND's 16:30-to-16:30 day, the one TODAY shows) reach the phone. When a day
  has more, the deterministic priority is, highest first, then the earlier moment:
  1. `BEFORE_SHIFT` — "Shift in 30 minutes" (the one that must not be missed)
  2. `SHIFT_DONE` — "Shift's done" (opens Alfred's debrief; carries the day-off moment, below)
  3. `TASK_DUE` — "Due today" at 16:00 (a real commitment, but also shown on TODAY)
  4. `WAKE` — "Up for the shift?" 3 hours before (only asks for a sleep log)
  Several tasks due the same day are now one moment ("Call the bank + 2 more").
- **Per-kind switches and quiet hours.** MORE → Work Schedule → KEY-MOMENT ALERTS: an ON/OFF per kind and QUIET HOURS
  (From/Until, may cross midnight; start inclusive, end exclusive). Saved as soon as changed. A kind turned off frees
  its slot for the next kind. Defaults: every kind on, no quiet hours, so today's behaviour only changes by the cap.
- **Quiet on the clock.** A moment strictly inside a scheduled shift is dropped (in practice only a task due while on
  the clock); the shift's own moments sit outside it.
- **Day off: fits an existing kind.** The end of the last shift of a run says "Last shift of the run; days off start
  now. Tap to debrief with Alfred." (still `SHIFT_DONE`, same link). **Plan to confirm: left out.** No existing kind
  means "a plan awaits confirmation" (the 4.0-c work-run draft has no alert); it would need a new kind, which this
  mission excludes. Recorded for a later decision.
- **Settings storage.** `keyMomentAlerts` is an optional, unindexed field on the existing `schedulePatterns` "current"
  row: native backups carry it (round-trip tested), no Dexie version bump. `setKeyMomentAlerts` never touches the
  schedule's own fields or `updatedAt` (an unsaved schedule stays unsaved); `updateSchedulePattern` keeps the field.
  The read path validates (zod) and falls back to the defaults on a malformed restored row.
- **Getting the plan to the phone without a manual sync.** Android gives BEYOND (a web app) no way to hand the Bridge
  anything without a tap, and the Bridge has no Internet permission, so a background *push* from BEYOND is not
  possible within this mission. Instead the plan is made to last, and the existing background check keeps it alive:
  - BEYOND's plan now reaches **28 days** ahead (was 8), already filtered and capped, carried by every existing link
    to the Bridge (SYNC GARMIN, the SYNC GARMIN shortcut).
  - Health Bridge 0.11.0 still holds at most 24 alarms, so it **rolls the window forward**: after each moment fires,
    at each 3-hourly GARMIN-AUTO-001 background check (`GarminCheckWorker`, which also refreshes the widget), and after
    a restart. One SYNC GARMIN keeps alerts coming for four weeks.
  - A changed schedule, task or alert setting reaches the phone at the next SYNC GARMIN (the screen says so).

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** BRIDGE-MOMENTS-001/002 plan and MomentAlerts alarms; GARMIN-AUTO-001's WorkManager check; the schedule
  row's native backup path; the lived-day boundary (`mostRecentBoundaryAtOrBefore`) and `livedDayShiftWindow`; the
  Work Schedule screen's chip controls; zod validation like `schedulePatternValidation`.
- **OWN:** the four-kind priority order, the lived-day cap, quiet-hours/on-the-clock filtering and the rolling re-arm.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- `tests/integration/bridgeNotify.test.ts`: cap and priority (ties by time), per-kind switch freeing a slot, quiet
  hours across midnight, quiet on the clock, a four-week capped plan (≤ 3 per lived day, > 24 moments), one task
  moment per day, the last-of-run text, settings validation, schedule-save preservation, unsaved schedule stays
  unsaved, native backup round-trip and malformed-row fallback. Existing `bridgePlan.test.ts` updated for the `kind`
  field. `tests/browser/WorkScheduleScreen.test.tsx`: switch and quiet hours save from the screen.
- Android `MomentsTest.armsARollingWindowPastTheMomentThatFired` (Health Bridge CI job).
- `TZ=UTC npm run verify` green; Health Bridge CI builds the 0.11.0 test APK.
- **Device check still needed** (Gavin's phone): install the PR's APK, tap SYNC GARMIN once, confirm alerts arrive
  (≤ 3 a day), a switched-off kind and quiet hours stay silent, and alarms continue after the first 24 moments.

## Deferred

- Plan-to-confirm moments (needs a new kind and a decision on what counts as a plan to confirm).
- A real background hand-off from BEYOND to the Bridge (would need a tap, an Internet-capable Bridge or a backend —
  each outside this mission).
- Moving a quiet-hours moment to the end of the window instead of dropping it; per-kind times; snooze.
- Schedule exceptions (overtime/time off) in the plan: the plan still follows the standing rotation as before.
