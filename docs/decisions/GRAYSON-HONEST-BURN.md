# GRAYSON-HONEST-BURN — "Not fully logged" days leave the burn estimate (owner go, 2026-11-24)

GRAYSON-MISSION-REVIEW-001 slice A (Launch 1.0 piece F4). Gavin's merge of the
[brief](../agent/GRAYSON-MISSION-REVIEW-001.md) approves these; the build PR records them.

- **The mark is an event on the day** (`FOOD_DAY_PARTIAL_SET`, payload `{ commandId, partial }`, strict), not a field on
  meals, so it can be undone and backs up like every other fact. The newest one for a day wins; unmarking is the same
  event with `false`. No table, no Dexie version.
- **Where:** BODY, under the day's food (the current day in HISTORY, and each past day in the day browser):
  **Not fully logged**, a 44 px switch. A change is a fix, so it shows **UNDO** (his Nov 24 undo rule, 8 s).
- **What it changes:** the burn estimate (`projectExpenditure`) leaves marked days out of intake; they don't count toward
  the 14 intake days, so it may go back to WAITING. Weigh-ins on those days still count. The card says "N days left
  out: not fully logged". The weekly calorie proposal reads the same estimate, so it follows. **With no mark saved the
  readout is exactly what it was** (no new field), tested.
- **Suggested days:** at the top of the monthly review, finished days in its 28-day window whose logged calories are
  under **half** his median logged day there, each with its date and calories and a switch, and **DONE**. Nothing is
  marked by itself. DONE records his answer for every shown day (marked or not), so a day he left unmarked isn't
  suggested again; UNDO unmarks what DONE marked.
