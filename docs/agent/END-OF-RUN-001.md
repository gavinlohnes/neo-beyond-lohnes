# END-OF-RUN-001 — the after-action reads a run as it was lived

- **Authority:** Gavin, 2026-10-29: "merge 340 and go end of run". Recorded in
  `docs/UX_DECISIONS.md` (END-OF-RUN-001).
- **Builder / lane:** Claude Code; Protected (it amends REPORT-001's report contents), within the
  owner's go. Branch `ccr-0be4f40f-16m0ja`.

## Finding

The end-of-run report already existed: REPORT-001's AFTER ACTION, offered on TODAY on the first day
off. Read against the owner's real history (locally, never committed), every run said "0 sessions,
0 sets", and the period began a day early, so a day-off sleep inflated a run's average.

## Scope

1. The block period is the lived days that hold its shifts.
2. A session counts only with a logged set; none reads "no workouts".
3. Sleep by night, FUEL (protein a day vs target, water a day, days logged), and open tasks in
   What's coming. At most six items.
4. Out of scope: when the line shows, and the BRIEFING.

## Leverage

- **REUSE:** REPORT-001 (`application/reportQueries.ts`, `ReportView`), the day ledger
  (`getDaySummaries`), `getEffectiveProteinTargetG`, `getCurrentlyEligibleUnresolvedObligations`.
- **OWN:** what a night-shift run's after-action says.
- **BUILD FROM SCRATCH:** none.

## Tests

`tests/integration/report001.test.ts` (block period, empty completion, sleep by night, FUEL, open
tasks); `tests/browser/Report001.test.tsx` unchanged and passing.
