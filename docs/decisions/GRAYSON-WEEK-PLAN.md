# GRAYSON-WEEK-PLAN — the training week on his Week A and Week B (owner go, 2026-11-25; today ruling 2026-11-26)

Gavin approved the [brief](../agent/GRAYSON-WEEK-PLAN-001.md) ("Brief all of it").

- **A new programme mode, WEEK_PLAN,** inside the existing TRAIN_PROGRAM_SET revision (no table, no Dexie version):
  one entry per week of his saved rota (Week A, Week B), each weekday a routine, Rest or an empty workout, plus
  one-day overrides by date. The old modes stay valid and restorable.
- **Resolved from his schedule's own anchor** (`scheduleWeekIndex`): a day's override first, then that week's
  weekday. Without a saved schedule it's one plain Monday-to-Sunday week, and the screen says so.
- **TRAIN and TODAY** plan today's workout from the week when he has one; a Rest day still lets him START. Without a
  week plan, nothing changes.
- **Changing a day:** JUST THIS DAY (an override that ends after its day) or EVERY WEEK A / B; MOVE TO puts the
  workout on another day this week and leaves Rest. Every change is a new revision, so UNDO puts the previous back.
- **Converting his current setup** is shown before saving (USE THIS WEEK / KEEP MY CURRENT SETUP). WEEKDAYS and
  ROTATION convert day by day; a SEQUENCE is laid three a week, days off first, carrying on from today's member.
- **Today on conversion (Gavin, 2026-11-26, the brief's stop-and-ask, "Keep today as now"):** USE THIS WEEK also saves
  a one-day override for today with what TRAIN plans right now, so today never changes; the week takes over tomorrow.
- **A missed day stays missed:** the plan never shifts itself.
