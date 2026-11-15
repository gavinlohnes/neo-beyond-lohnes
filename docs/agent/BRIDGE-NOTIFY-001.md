# BRIDGE-NOTIFY-001 — key-moment alerts held to the notification contract, and kept on the phone

- **Authorization:** Gavin, 2026-11-15, chose item 1 of the ranked opportunities ("Finish the notification contract
  and get the plan to your phone without a manual sync") as a bounded mission: at most 3 key-moment alerts a day;
  per-kind off switches, quiet hours, and day-off or plan-to-confirm moments where they fit existing kinds; send the
  alert plan through the existing background sync instead of only on SYNC GARMIN; no new alert kinds; no Engine rule
  changes; stay inside `bridgePlan.ts` and the Android alert machinery; full gate; do not merge. It implements
  [BEYOND-4.0](BEYOND-4.0.md) decision 5 for the existing BRIDGE-MOMENTS-001/002 moments.
- **Builder:** Grok Bot. Branch `codex/bridge-notify-001` from fetched `origin/master` `527332ef` (#552 merged).
- **Lane: Protected.** `npm run check:risk -- 527332ef` suggests PROTECTED (governance docs; domain types). Semantically
  it also adds a persisted settings field that backups carry and changes how notifications reach the owner. Independent
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
- **Quiet on the clock.** A moment strictly inside a shift of the standing rotation is dropped (in practice only a task
  due while on the clock); the shift's own moments sit outside it. Schedule exceptions (swaps, overtime, time off) and
  SHIFT-CORRECT-001 corrected work marks are not consulted; the settings screen says so ("a shift of your standing
  rotation").
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
  - Health Bridge 0.11.x still holds at most 24 alarms, so it **rolls the window forward**: after each moment fires,
    after a restart, at each SYNC GARMIN, and at each 3-hourly GARMIN-AUTO-001 background check (`GarminCheckWorker`,
    which also refreshes the widget). That check is scheduled **only when Health Connect background access (Auto
    sync) is allowed**; without it the window rolls forward on each fired alert and on restart, which still keeps the
    chain going. One SYNC GARMIN keeps alerts coming for four weeks.
  - **Re-arm never loses a late alarm (0.11.1, review fix).** The alarms are inexact; Android may deliver one up to an
    hour after its time (Doze a little more). The Bridge keeps the keys of moments it has actually shown. Each re-arm
    clears its 24 slots and sets again every moment *not yet shown* that is still to come or came due within
    `GRACE_MS` (2 hours); an overdue one fires at once. A moment is dropped only once shown, or once more than 2 hours
    old (e.g. the phone was off), never because a re-arm ran while Android still held its alarm. `notify` ignores a
    key already shown, so nothing shows twice; still at most 24 alarms. A new plan from SYNC GARMIN carries over an old
    moment that is due within the grace window, unshown and absent from the new plan (BEYOND only sends moments still
    to come). An alarm set by 0.11.0 (time only) is still matched by time after the update.
  - **Same-time moments (0.11.1, review fix).** A moment's identity is its time and kind (`Moment.key`, `at|kind`, on
    the alarm, the shown set and the notification id). Two moments at the same minute, e.g. a 16:00 "Shift in 30
    minutes" and a 16:00 "Due today" before a 16:30 shift, are two distinct notifications, each shown once; each
    honestly uses one of the day's 3 slots. Chosen over merging because both are real, distinct alerts and it needs no
    change to the contract. BEYOND never emits two moments with the same time and kind (tested).
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
- Android `MomentsTest` (Health Bridge CI job): the rolling window past shown moments within the 24 cap; a worker
  re-arm before a late delivery keeps the moment (fake AlarmManager slots: cancel then set), no duplicate once shown,
  drop after the grace window; overdue moments still capped at 24; two same-time moments are two alarms and two
  notification ids; shown-key pruning; a new plan carries an unshown due moment; plan JSON round-trip.
- `tests/integration/bridgeNotify.test.ts`: same-time moments are two alerts using two slots; plan keys are unique.
  `tests/browser/WorkScheduleScreen.test.tsx`: two switches tapped in the same tick both save.
- `TZ=UTC npm run verify` green; Health Bridge CI builds the 0.11.1 test APK.
- **Device check still needed** (Gavin's phone): install the PR's APK, tap SYNC GARMIN once, confirm alerts arrive
  (≤ 3 a day), a switched-off kind and quiet hours stay silent, and alarms continue after the first 24 moments.

## Deferred

- Plan-to-confirm moments (needs a new kind and a decision on what counts as a plan to confirm).
- A real background hand-off from BEYOND to the Bridge (would need a tap, an Internet-capable Bridge or a backend —
  each outside this mission).
- Moving a quiet-hours moment to the end of the window instead of dropping it; per-kind times; snooze.
- Schedule exceptions (overtime/time off) in the plan: the plan still follows the standing rotation as before. Quiet
  on the clock likewise ignores exceptions and SHIFT-CORRECT-001 corrected work marks (UI copy says "standing
  rotation"); extending it waits for a decision, since the plan is built ahead and a correction is known only later.

## Independent review (088c9609, BLOCK) — responses

- Re-arm drops a due but undelivered alarm → shown-set plus 2 h grace re-arm (above), Android tests; Health Bridge
  0.11.1 (versionCode 13).
- Not mergeable / stale checkpoint → merged `origin/master` (`2e68feaf`, #553) with a normal merge commit;
  `UX_DECISIONS.md` keeps both sections (WORK TRANSITION amended first); checkpoint updated.
- Docs: the 3-hourly roll-forward needs background access → README and this brief say so.
- Same-time moments collapse → time-and-kind identity on the Bridge; both shown, both counted.
- "Nothing sounds during a shift" broader than the code → copy now says a shift of the standing rotation; deferral above.
- `save()` drops rapid changes → changes apply to the latest settings and saves run in order; browser test.
