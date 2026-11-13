# LIFE-STATE-003 — Life-State Engine, slice 3: post-run report and recovery contract

- **Authorization:** Gavin, 2026-11-13: "Life-State Engine — Slice 3: recovery contract and post-run report."
  **Lane:** Protected (TODAY); independent exact-head review required.
- **Builder / branch:** Claude Code; `ccr-88f5c085-life-state-3` from `c1f27a4f` (#495 merged).
- **Scope:** on slice 2's RUN OVER, a post-run report from recorded lived days and an optional, confirm-first recovery
  contract of plan items for the first full day off.
- **Exclusions:** Overloaded; evidence system; training coupling; capture; family sharing; schedule or training-plan
  changes; coaching; Engine/recommendation, schema, command or event changes.
- **REUSE:** slice 1–2 state and moments, Whole Picture rows, `createObligation`, `hasPlanItem` / `livedDayDates`,
  preview → CONFIRM.
- **OWN:** the report's wording (`postRunReport.ts`), the contract's three items (`recoveryContract.ts`) and TODAY's
  after-the-run section (`RecoveryContract.tsx`).
- **BUILD FROM SCRATCH:** none beyond that.
- **Acceptance:** unit tests for the report (counts, thin data, nothing to report, calm words); browser tests for the
  report on TODAY (read when opened, no writes, axe, below the next card), the contract (choose, CANCEL writes nothing,
  CONFIRM writes the chosen items for Sat) and no second offer after midnight.
