# CONTEXT-INTEGRATION-001 — unified schedule consistency

- **Authorization:** Gavin, 2026-11-13 ("CONTEXT-INTEGRATION-001 — Unified Schedule Consistency"). **Lane:** Feature
  (read-side agreement and Alfred's provenance text; no Engine, schema, event, command or TODAY-structure change), so
  no independent review is required.
- **Builder / branch:** Claude Code; `ccr-88f5c085-context-integration` from `9a128ae4` (#496 merged).
- **REUSE:** recorded `BeyondDay.workContext` and `WORK_CONTEXT_SET`'s source (`getWorkContextSource`), the saved-schedule
  check `isOperatorSavedSchedule`, `scheduledWorkContextForLivedDay`, the 16:30 lived day. **OWN:** one resolver,
  `application/workContextResolution.ts`, and its wiring. **BUILD FROM SCRATCH:** none.

## Trace before this change (the same lived day)

| System | Read | Gap |
|---|---|---|
| Saved schedule / TODAY | `day.workContext` (MANUAL or SCHEDULE_STANDING at day start) | — |
| Life State | recorded today/yesterday, else schedule | WHY said "recorded as" for a schedule-set day |
| Week Ahead | the rotation only, **even with no saved schedule** | ignored today's record; showed shifts and suggestions from BEYOND's built-in default |
| Energy forecast | the rotation for run positions | ignored recorded days (overtime, a day taken off) |
| Training programme | recorded, else schedule | — (now through the shared resolver) |
| Alfred's context | "Recorded event" for today; the default rotation as "Configured work schedule" when none was saved; next 7 days as bare WORK/OFF | provenance wrong in all three |
| Free helper | "From your saved schedule" always | invented a shift (and 18:00) with no saved schedule |

## After

One resolver: **RECORDED** (who set it: you, or the schedule at day start) → **PREDICTED** (saved rotation) →
**UNKNOWN**. Week Ahead carries `basis` per day (RECORDED · PREDICTED · WHAT_IF · UNKNOWN; unknown days show "Work or
off not known · no saved schedule" with no suggestion, time or What-If; recorded days are marked and take no What-If).
The energy forecast uses recorded days for history and today. Alfred and the free helper say where each fact came
from. What-If stays hypothetical; schedule changes never rewrite a recorded day; overnight shifts belong to the lived
day they start in.

## Gap: CONFIRMED future exceptions (decided: SCHEDULE-EXCEPTIONS-001)

BEYOND has no record of an operator-approved future change (overtime next Tuesday, a swap, a day off booked ahead).
Today such a day can only become known once its lived day starts and is recorded. Adding it needs new persistence and
event semantics (Protected), so it was not built. The resolver's `CONFIRMED` basis is reserved for it.
Gavin approved it as SCHEDULE-EXCEPTIONS-001, which fills the basis; see [SCHEDULE-EXCEPTIONS-001.md](SCHEDULE-EXCEPTIONS-001.md).
