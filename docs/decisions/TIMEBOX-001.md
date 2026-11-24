# TIMEBOX-001 — his own time estimates on tasks (owner go, 2026-11-18; restarted 2026-11-23)

Gavin, 2026-11-18, on the manual-timeboxing proposal (HARVEST-002 row "Manual timeboxing"): "Owner likes 3 and 4…
propose a tight first bounded mission… Do not start implementation until I confirm", then "Go" to the mission with all
six recommended defaults. 2026-11-23 21:07 CT: "Restart TIMEBOX-001 on current master". [Brief](../agent/TIMEBOX-001.md).

1. **Estimate only.** A task may carry his own estimate. BEYOND never schedules, blocks time, runs a timer, compares
   actual to estimate, moves anything, or invents an estimate. Missing means "no estimate", never zero.
2. **Day total = the sum of his estimates + "N of M tasks have a time".** Never "free", "full", "available", capacity or
   hours left. A day with tasks but no estimates says "No time estimates yet · 0 of M tasks have a time."
3. **Where it is set:** Intent (create and edit), Plan Today (add-task composer), the Week planner (PLAN DAY sheet), and
   optionally when turning a capture into a task. **Alfred stays out:** no Alfred tool, card or free-helper parsing
   reads or writes estimates.
4. **Recurrence carries the estimate** to the next occurrence, like REMIND-AT-001's time.
5. **1–480 whole minutes** (1 minute to 8 hours), entered as hours + minutes. Anything else is refused with a plain
   message; a malformed stored value is dropped on read without dropping the task.
6. **Narrow WEEK-PLANNER-002 exception.** WEEK-PLANNER-002 excluded "task duration/free-time estimates". This amends only
   that: the Week planner may show his own estimates on a task row, an estimate field in the PLAN DAY sheet and the
   selected day's estimate total line. Its other exclusions stand: no free-time or capacity claim, no auto-scheduling,
   and the "These are item counts, not hours available" line stays. The day buttons keep item counts only.

A resolved (done or released) task's estimate is history and can't be changed.
