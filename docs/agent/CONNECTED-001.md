# CONNECTED-001: a more interconnected, smarter BEYOND

- **Authorization:** Gavin, 2026-11-07. Asked to "expand BEYOND's capabilities and make it more interconnected
  and smarter", he chose **All** of the four slices below. Builder: Claude Code. One PR per slice, each with
  independent exact-head review and green CI.
- **Starting commit:** `c2523c7d` (#430).
- **Boundaries for every slice:** read-only composition of records BEYOND already keeps. No Engine,
  recommendation, schema, event, backup or primary-tab change. Nothing is inferred and presented as fact;
  thin data says so. TODAY's top is untouched.

## Slices

1. **Connections (CONNECT-001).** On a project or task, list every record that links to it with an explicit
   `[[label]]`: daily notes, decision journal, highlights, tasks, projects. Only links the operator wrote count.
2. **Patterns.** A descriptive "what tends to go with what" view in Review, built on Whole Picture's existing
   per-day rows and its 3-observation rule. It never recommends, grades or claims a cause.
3. **Calendar with your day.** Google Calendar events, from the existing approved sync, shown next to tasks in
   LIFE and Plans. Read-only; no booking or rescheduling.
4. **Alfred's connected context.** Alfred's planning context also reads projects, people, routines and recent
   notes. It changes what Alfred reads, not what it can save; confirm-before-save stays.

**Leverage gate.** REUSE: `getMentions`/`wikiLabels` (A3), `readSection` and `Section` (LIFE-PATTERN-001),
Whole Picture rows, the Google Calendar sync (A8) and `buildPlanningContext`. OWN: how those are joined.
BUILD FROM SCRATCH: none.
