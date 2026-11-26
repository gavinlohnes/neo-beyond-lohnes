# GRAYSON-FITS-NOW — your own meals that fit what's left of today (owner go, 2026-11-26)

Gavin's merge of the [brief](../agent/GRAYSON-FITS-NOW-001.md) approves these; the build PR records them.

- **What's left:** today's calorie target through the one day-target query (`getDayCalorieTarget`, the plain target when
  targets by kind of day are off) minus what's logged today; protein target minus today's protein. No calorie target,
  no Fits now.
- **Which meals:** his saved meals, not archived, one serving at or under what's left; over by 50 kcal or less "about
  fits". Saved meals only, because they're what he actually eats and already carry their numbers.
- **Order:** most protein toward what's left first (his goal is to lose weight and keep muscle); a tie goes to the meal
  logged most on this kind of day (the eating window's kinds) over the last 28 days. At most three.
- **When:** at least 150 kcal left and the eating window (if he uses it) not closed (fasting, or past its planned
  close); under 60 minutes left says "Window closes in N min". Nothing fits: one plain line, no list, no colour.
- **One tap:** LOG logs one serving now through `logMeal`, with the meal log's own receipt. The meal log has had no
  UNDO since OWNER-GO-001 ("When I log some stuff it says delete or undo. That can go away") and the Nov 24 undo rule
  (Undo only after a fix or a removal); a log is removed from DATA's history as today.
- **Every row says what it leaves**; on or off in MORE · Nutrition targets (default on, this phone, travels with backups).
