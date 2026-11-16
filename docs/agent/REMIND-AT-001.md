# REMIND-AT-001 — reminders at a set time, inside the 3-a-day cap

- **Authorization:** Gavin, 2026-11-15 17:49 CT, approved the overnight sprint plan ("Approved. If you have anything you
  want to change ask me and I'll decide."); Wave 3 lists "REMIND-AT-001 (reminders at a set time, inside the 3-a-day
  cap)". Bounds from the plan: no new alert kinds, no Engine rule changes, no migrations or schema version bumps, no new
  Android permissions or dependencies, no Health Bridge change. It takes up the ROADMAP_1.0 candidate "reminders at an
  exact time of day" on top of [BRIDGE-NOTIFY-001](BRIDGE-NOTIFY-001.md).
- **Builder:** Grok Bot. Branch `codex/remind-at-001` from fetched `origin/master` `b921d303` (#557 merged).
- **Lane: Protected.** `npm run check:risk -- b921d303` suggests PROTECTED (domain types). Semantically it adds an
  optional persisted field that native backups carry and changes when an existing notification fires. Independent
  exact-head review, green CI; Gavin merges. No Dexie version, Engine, dependency, permission, Bridge or alert-kind change.
- **Active PR:** pending (linked from the checkpoint once opened).

## What changes

- **A task can carry a reminder time.** `Obligation.remindAt` is an optional `HH:MM` (24-hour) local clock time on the
  task's `dueAt` day. It needs a due date (`REMIND_AT_NEEDS_DUE` otherwise); `modifyObligation` accepts a new time or
  `null` to remove it, and a new due date keeps the time. A repeating task's next occurrence keeps its time. `dueAt`
  stays a day: the time is only when he asked to be reminded. Unindexed, so no Dexie version change; native backups
  carry it (round-trip tested); a malformed restored time is dropped without dropping the task.
- **The alert fires at that time, as the existing `TASK_DUE` kind** (`src/application/bridgePlan.ts`). A timed task's
  moment is at its time ("Reminder", the task's title) instead of the 16:00 "Due today" moment. Same per-kind switch,
  quiet hours, quiet-on-the-clock, priority (`BEFORE_SHIFT` > `SHIFT_DONE` > `TASK_DUE` > `WAKE`, then the earlier
  moment) and the 3-a-day lived-day cap. Tasks at the same minute share one moment, so a moment's time and kind stay
  unique for the Bridge (no Bridge change: 0.11.x already takes any time with an existing kind).
- **Honest when setting it.** `reminderAlert` runs the same contract with the task in it (replacing its saved copy when
  editing) and the screens show one line: "Alerts at 17:30 on Mon 16 Nov. Your phone gets it at the next SYNC GARMIN.",
  or "Won't alert:" with the reason: already passed; task alerts off; in quiet hours (named); during a shift of the
  standing rotation; that day already has 3 alerts that come first. A time more than four weeks out says it reaches the
  phone at a SYNC GARMIN within four weeks of it (the plan's horizon). The line is true as of now; it says so implicitly
  by being recomputed wherever the task is shown.
- **Where it's set.** MORE → Missions & Obligations (also where a task opens from PLAN or LIFE): the create form and the task editor get a "Remind at" time (enabled once a due
  date is set; clearing it removes the time), with the line beneath; the task's page shows "Due: … · reminder 17:30" and
  the line. Alfred and the free helper use the existing `add_reminder` card: a `when_note` that is an `HH:MM` clock time
  with a due date becomes `remindAt` (anything else, like "after I wake", stays a note as before), and the card shows
  the alert line before SAVE. "remind me to call mum at 17:30 tomorrow" works offline. No new low-risk kind.
- **Timezones and DST.** A wall-clock time like `dueAt` itself, built with the device's local calendar, so 17:30 stays
  17:30 across a DST change; a time in the spring-forward gap fires at the real time the clock shows (02:30 → 03:30 on
  14 Mar 2027 in America/Chicago) and the line names that time. Tested under `TZ=UTC` and `TZ=America/Chicago`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** BRIDGE-NOTIFY-001's `applyAlertContract`, `inQuietHours`, `KIND_PRIORITY`, `MAX_PER_DAY`, the 28-day plan and
  Health Bridge 0.11.x alarms; the `TASK_DUE` kind; `createObligation`/`modifyObligation` and the obligation zod schemas;
  the free helper's existing clock-time reading (`remind me … at 17:30 tomorrow`); the `add_reminder` registry entry.
- **OWN:** the timed task moment and its same-minute grouping, and the "won't alert" reasons from the same contract.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- `tests/integration/remindAt.test.ts` (both TZs): store/clear/refuse without a due date/keep on new date/carry to next
  occurrence; native backup round-trip and malformed-time fallback; timed `TASK_DUE` at its time beside a 16:00 one,
  same-minute grouping, unique keys; every reason (past, on the clock, cap full with priority and time order, own copy
  replaced when editing, later than the horizon, quiet hours named, task alerts off); DST fall-back and spring-forward;
  Alfred/free-helper card to `remindAt`, non-clock notes unchanged.
- `tests/browser/RemindAt001.test.tsx` at 320px: create with a time shows "Alerts at…", edit into quiet hours shows
  "Won't alert: 23:30 is in your quiet hours (22:00 to 07:00).", save and clear; no horizontal overflow.
- Existing `bridgeNotify`, `bridgePlan`, IntentScreen and Alfred tests unchanged and passing.
- `TZ=UTC npm run verify`.
- **Device check (Gavin's phone):** set a reminder a few minutes ahead, tap SYNC GARMIN, confirm it arrives at that time.

## Deferred

- A time on the quick-add, capture-promotion and TODAY quick-date forms (they keep a date only; the time still goes in
  the note as before).
- Moving a reminder out of quiet hours instead of dropping it; snooze; more than one reminder per task.
- Telling him later if a reminder that alerted when set loses its slot to a shift or earlier task added afterwards.
