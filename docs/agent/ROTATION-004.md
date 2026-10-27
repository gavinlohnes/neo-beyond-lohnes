# ROTATION-004 — your whole day on one line

- **Authority:** Gavin, 2026-10-27: "go 004", after the proposal in this session. FEATURE (display
  only). Builder: Claude Code; `ccr-0be4f40f-16m0ja` from `c3338a0` (#300 merged). Merge is Gavin's.
- **Outcome:** each actogram row (runs and flips) also shows when you logged meals (triangles),
  water (short ticks) and started workouts (diamonds), in the same 16:30 frame as sleep and the
  scheduled shift; a legend names every mark; each day's button lists the times.
- **Rules:** recorded times only — meal and water event time, workout start; undone/voided entries
  are left out; nothing is inferred, scored or compared. No new records, Engine input or TODAY change.
- **REUSE:** ROTATION-002/003 actogram and rows; existing MEAL/WATER events and their void events;
  day-ledger workouts. **OWN:** the marks projection. **BUILD FROM SCRATCH:** none.
- **Evidence:** integration (exact minutes, undone water excluded) and browser (marks, legend,
  accessible text, axe, 390 px); screenshot `docs/screenshots/rotation-004/`; full verify; CI.
