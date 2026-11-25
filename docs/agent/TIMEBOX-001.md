# TIMEBOX-001 — his own time estimates on tasks

- **Authorization:** Gavin, 2026-11-18, after the four-idea briefs (HARVEST-002 "manual timeboxing"): "Owner likes 3
  and 4… propose a tight first bounded mission… Do not start implementation until I confirm", then **"Go"** with all
  six recommended defaults (see [decision](../decisions/TIMEBOX-001.md)). Restart, 2026-11-23 21:07 CT: **"Restart
  TIMEBOX-001 on current master"**.
- **Lane: Protected.** It adds an optional persisted field to `Obligation` (domain types + zod schemas) and amends one
  WEEK-PLANNER-002 exclusion. Independent exact-head review, green CI; Gavin merges. No Builder merge.
- **No Dexie version bump or migration:** `estimateMinutes` is optional and unindexed (the REMIND-AT-001 precedent), so
  `db.ts` is untouched. **No backup contract change:** native backups already carry every obligation field; a
  round-trip test proves the estimate survives and an older row without it restores unchanged. **No Engine change.**
  No dependency, provider, IA or navigation change. #633's and #606's files are untouched.
- **Starting commit:** `origin/master` `054996cb` (#634 merged). **Builder:** Grok Bot. Branch `codex/timebox-001`.
  The pre-restart WIP (model, validation, commands, form field; written on `6a359d01`) applied cleanly and was reused.
- **Active PR:** see the PR for this branch (status lives in the PR body while #633 is open).

## Scope

- `Obligation.estimateMinutes?: number` — 1–480 whole minutes, his own guess. `createObligation` and
  `modifyObligation` accept it (`null` clears); validation errors start `ESTIMATE_INVALID`; a resolved task's estimate
  can't change. A malformed stored value reads as no estimate. A repeating task's next occurrence keeps it.
- Pure helpers in `src/domain/intent/estimate.ts`: read the hours + minutes form, say an estimate ("1 h 30 min"), and
  total a list: "Your estimates: 1 h 15 min · 2 of 3 tasks have a time." Never free, full or capacity.
- One shared `EstimateFields` control (Hours + Minutes, optional, 16px, 44px fields), used in:
  - Intent: create form and task editor; the task page shows "Your estimate: …"; list summary shows "est. …".
  - Plan Today: the add-task composer ("Date, Mission, repeat & estimate"); rows show "Est. …"; the Today list shows the
    day total line.
  - Week planner: the PLAN DAY sheet saves the planned day and estimate in one guarded write (`moveWeekTask`'s new
    optional `options.estimateMinutes`); rows show "Est. …"; the selected day shows the total line.
  - Capture to task (`CapturePromotionForm`, used by quick capture, Capture list and Notes Sweep): optional.
- **Excluded:** scheduling/time blocking, timers, actual vs estimate, capacity or free-time labels, day-button hours,
  Alfred/free-helper estimates, Engine or recommendation inputs, schema/migration/backup format changes.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** REMIND-AT-001's optional-unindexed-field pattern (create/modify/next occurrence/`.catch(undefined)` read
  fallback and backup round-trip test); `modifyObligation`; WEEK-PLANNER-002's guarded `moveWeekTask` and sheet;
  CAPTURE-PARITY-001's shared promotion form; existing `.input`/`.meta` styles. HARVEST-002 research (Super
  Productivity, MIT) informed the idea only; no code adapted.
- **OWN:** the estimate rules, the total line wording, and the shared `EstimateFields` control.
- **BUILD FROM SCRATCH:** none beyond BEYOND mappings; no dependency.

## Acceptance

- `tests/integration/timebox001.test.ts` (both TZs): form reading (1–480, whole numbers, blank = none, refusals),
  wording, the day total with "N of M" (malformed values not counted, no free/full wording), create/modify/clear,
  resolved refusal, recurrence carry-over (and none without), native backup round-trip + malformed restore, capture to
  task, the Week planner sheet's combined guarded write (stale, outside week, invalid, resolved, no-op).
- `tests/browser/Timebox001.test.tsx`: Plan Today add with estimate + total line; Week planner sheet by keyboard, total
  updates, clear and invalid; Intent create/edit/clear; capture form; 320/360/412px no overflow, 16px text, 44px
  fields, axe clean. New tests fail on master (verified).
- Existing WeekPlanner, IntentDraftProtection (summary text renamed), REMIND-AT-001, capture parity suites pass.
- typecheck, check:architecture, check:risk, build, focused tests in UTC and America/Chicago, full `TZ=UTC npm run verify`.
- Screenshots: `docs/agent/screenshots/TIMEBOX-001/` (before at 360px from master; after at 320/360/412px).
- **Device check (Gavin):** PLAN → Week planner → PLAN DAY on a task → set 30 min → the day shows "Your estimates: 30 min ·
  1 of N tasks have a time".
