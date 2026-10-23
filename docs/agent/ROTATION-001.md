# ROTATION-001 — BEYOND learns your rotation

- **Authority:** Gavin, 2026-10-23: "go ROTATION" (after the proposal: rotation map, night-N patterns,
  flip planning, a sleep-aware Engine as a separate Protected decision, then experiments).
- **Builder / branch:** Claude Code; `claude/rotation-1` from `4d38b3a`. Phase 1 lane: Routine
  (display only).
- **REUSE:** Whole Picture's 56 lived-day rows (recorded work context, main sleep, check-in energy,
  sessions), its Week Ahead forecast, its day inspector and source records, and its tab/section
  styling.
- **OWN:** grouping lived days into runs by recorded context (`rotationProjection.ts`); the next
  predicted run from Week Ahead.
- **BUILD FROM SCRATCH:** the Rotation tab (`RotationMap.tsx`).
- **Phase 1 scope:** a Rotation tab in Whole Picture: recent runs newest first (work runs, days off,
  unknown-context stretches), one cell per lived day (main sleep, energy, workout) that opens the
  existing day inspector; the next predicted run. Bounded with SHOW MORE.
- **Excluded in phase 1:** sleep timing blocks, night-N patterns, flip suggestions, Engine change,
  experiments, any write.
- **Next phases (each needs its own go):** 1b sleep timing per day; 2 night-N patterns with sample
  sizes; 3 flip planning (suggestions only); 4 sleep-aware Engine (Protected); 5 experiments
  (Protected, new record kind).
