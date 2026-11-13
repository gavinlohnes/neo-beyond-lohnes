# LIFE-STATE-001 — Life-State Engine, slice 1: the day's operating state on TODAY

- **Authorization:** Gavin, 2026-11-13: "Life-State Engine — Slice 1: detect operating state and make TODAY
  state-aware." **Lane:** Protected (TODAY's hierarchy); independent exact-head review required.
- **Builder / branch:** Claude Code; `ccr-88f5c085-life-state-1` from `d10775c1` (#493 merged).
- **Scope:** derive WORK RUN, RECOVERY, FLIP and FREE from the saved schedule and recorded lived days; show it on TODAY
  in plain language with its sources; order TODAY's supporting sections by it.
- **Exclusions:** Overloaded; evidence system; training coupling; capture; family sharing; Engine/recommendation,
  schema, command or event changes; new tracking; redesign.
- **REUSE:** `shiftRun` (run position), `scheduledWorkContextForLivedDay`, `isOperatorSavedSchedule`,
  `livedDayStartOf`, recorded `BeyondDay.workContext`, TODAY's existing sections.
- **OWN:** the four-state rule and its wording (`src/application/lifeState.ts`, `LifeStateBand.tsx`).
- **BUILD FROM SCRATCH:** none beyond that mapping.
- **Acceptance:** unit tests for each state, recorded-over-scheduled precedence, unknown and the 2-2-3 rotation across
  two weeks; browser tests on TODAY for each state (line, WHY, section order, calm line kept, no writes, axe) and for
  no schedule.
