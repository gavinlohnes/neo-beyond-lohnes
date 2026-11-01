# WEEK-PLAN-001 — plan my week (first version)

- **Authority:** Gavin, 2026-11-01: "We will do plan my week Now", on the proposal: Week Ahead shows
  planned/due tasks per day, an Alfred "plan this for [day]" card, and a Plan my week quick-start.
- **Builder:** Claude Code. **Lane:** Feature. No schema, Engine, dependency or TODAY composition change.
  Branch `ccr-0be4f40f-16m0ja` from master `3c615b7`.

## What changes

- **Week Ahead** (MORE → WEEKLY CHECK-IN → Week ahead; search "week ahead" or "plan my week") lists,
  under each of the next seven days, the open commitments **planned** for it and those **due** on it.
  Undated commitments are on no day. A failed read says so instead of showing an empty week.
- **PLAN MY WEEK WITH ALFRED** (in Week Ahead) and **Plan my week** (Alfred → Plan) ask Alfred to place
  open tasks, project steps, birthdays and home jobs around shifts and sleep, one card per placement.
- **Alfred `task_plan` card**: "Plan: Book a tip run · Tue, Nov 3". SAVE sets only that task's existing
  planned date (`plannedAt`); due dates and status are untouched. Same guards as his other task cards:
  the title must match, a task edited after the card was proposed is refused, and impossible dates get
  no card. Alfred now sees planned dates in OPEN TASKS.
- A planned day set this way is identical to one set in the commitment editor, so TODAY's existing
  "planned today" advisory reads it as before. Nothing new reaches the Engine.

## REUSE / OWN / BUILD FROM SCRATCH

REUSE: Obligation `plannedAt` and `modifyObligation`, Week Ahead, Alfred cards and
`confirmContextProposal` guards, `isRealDate`. OWN: the per-day projection and the planning ask.
BUILD FROM SCRATCH: none.

## Acceptance

`tests/integration/weekPlan.test.ts`: planned-first placement, undated and out-of-week excluded, the
card sets only `plannedAt` on confirm, stale or impossible cards refused. `tests/browser/WeekPlan.test.tsx`:
planned and due shown on their days at 360px with axe, the button asks Alfred the plan question.
