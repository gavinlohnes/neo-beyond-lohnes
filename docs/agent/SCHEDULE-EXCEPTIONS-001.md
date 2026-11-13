# SCHEDULE-EXCEPTIONS-001 — confirmed future schedule exceptions

- **Authorization:** Gavin, 2026-11-13. He approved SCHEDULE-EXCEPTIONS-001, "including the bounded Protected changes
  necessary to persist and correct confirmed future schedule exceptions". **Lane:** Protected. It adds a new Dexie
  table (schema v26), a new `WORK_CONTEXT_SET` source value, and a change to the day-start standing rule. It needs an
  independent exact-head review.
- **Builder / branch:** Claude Code, on `ccr-88f5c085-schedule-exceptions` from `baccd2c2` (#497 merged).
- **Excluded:** unrelated Engine changes, new external providers, calendar redesign, new navigation or dashboards,
  What-If writes, and Alfred commits.
- **REUSE:**
  - CONTEXT-INTEGRATION-001's resolver, whose `CONFIRMED` basis was reserved for this;
  - the standing rule (`deriveStandingWorkContext`) and the `WORK_CONTEXT_SET` event;
  - `writeAtomically`;
  - the replace-only restore through dexie-export-import, which reads older backups;
  - Week Ahead and Shift What-If.
- **OWN:** the `scheduleExceptions` store and its commands, and the confirm/cancel UI.
- **BUILD FROM SCRATCH:** none. Rotation exceptions are a common pattern (an RRULE with EXDATE/RDATE, or crew
  scheduling's swap and overtime records). BEYOND needs them local, as absolute WORK/OFF days with an audit trail, so a
  small owned table fits better than a calendar library.

## Model

`scheduleExceptions` row (`domain/scheduleExceptions.ts`):

| Field | Meaning |
|---|---|
| `id` | A stable id. |
| `date` | The lived day that starts at 16:30 on this date. |
| `kind` | `WORK` or `OFF`. |
| `reason` | `OVERTIME`, `TIME_OFF` or `SWAP`, with a shared `swapId` for a swap. |
| `note` | An optional note. |
| `status` | `ACTIVE` or `CANCELLED`. |
| `history` | Append-only: `CONFIRMED`, then `CHANGED` and `CANCELLED` entries. |

Commands (`application/scheduleExceptions.ts`); each one is called only after a UI preview and CONFIRM:

- `confirmScheduleException` adds overtime or time off for one day.
- `confirmShiftSwap` adds both dates in one transaction.
- `changeScheduleException` edits the note.
- `moveScheduleException` cancels the old day and confirms the new one.
- `cancelScheduleException` cancels the whole group. Nothing is deleted.

Refusals:

| Code | When |
|---|---|
| `EXCEPTION_DAY_STARTED` | The lived day has already started (16:30). |
| `EXCEPTION_NO_SCHEDULE` | No saved rotation. |
| `EXCEPTION_MATCHES_ROTATION` | The change is what the rotation already says. |
| `EXCEPTION_CONFLICT` | The date already has an active change. It is never silently overwritten. |
| `EXCEPTION_SWAP_*` | A swap half is invalid. Neither half is written. |

## Authority

**RECORDED > CONFIRMED > PREDICTED > UNKNOWN.**

- A confirmed change is a plan. It is never "worked".
- When its lived day starts, `startDay` records it as the day's work context, with source `SCHEDULE_EXCEPTION`. From
  then on it is RECORDED (by EXCEPTION), and a manual correction on TODAY still wins.
- Exceptions are absolute days. Editing the rotation later leaves them as confirmed.
- What-If, Alfred, calendars and conversation never write them.

## Where it shows

- **Week Ahead:** a CONFIRMED basis, " · confirmed change", and no What-If on that row. Under a What-If there is an
  optional "MAKE IT A CONFIRMED CHANGE" step (just this day, or a swap), with REVIEW and then CONFIRM. A "CONFIRMED
  CHANGES" list offers EDIT NOTE and CANCEL CHANGE, each confirmed first.
- **Also reads exceptions:** the energy forecast, the training programme slot, Life State and life-transition
  (today, yesterday and tomorrow), Alfred's next-7-days line ("(confirmed change)", "Alfred cannot change the
  schedule"), and the free helper ("A schedule change you confirmed.").

## Backup and restore

- A new backup carries the table, including each row's history.
- An older backup (v25 or earlier, without the table) still restores. Restore replaces everything, so it ends with no
  exceptions.
- Both cases are tested in `tests/integration/scheduleExceptions.test.ts`. The migration test covers v26.

## Residual risks

- `shiftRun` ("Shift N of M") still counts the rotation alone, so a confirmed overtime day does not lengthen the run
  count shown in Life State.
- Moving an exception is a command only. There is no UI for it; the UI path is cancel and confirm again.
- Exceptions need a saved rotation.
