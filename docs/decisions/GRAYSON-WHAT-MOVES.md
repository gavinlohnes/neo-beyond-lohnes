# GRAYSON-WHAT-MOVES — what moves your numbers (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-WHAT-MOVES-001.md) approves these.

- **What's compared:** each active habit (DONE days against NOT DONE days; days with no answer count on neither side),
  trained against not, and work day against day off (unknown context left out). Each is compared with the next lived
  day's main sleep, last check-in energy and Garmin resting heart rate. The next day is joined 16:30 to 16:30,
  DST-safe, and a gap leaves it missing, never zero.
- **How it's judged:** Try experiments' Welch 95% interval and verdict, with 5 days a side minimum. "About the same"
  means within 15 minutes of sleep, 0.5 of energy or 2 bpm. Clear lines come first, ordered most certain first (the
  narrowest interval for its band), then the same ones. "Can't tell yet" is folded into one list.
- **Longer history (Gavin, 2026-11-24, "Same projections"):** Whole Picture holds 56 days, but the window is 90 days
  by default, with 180 and All as choices. So this reads the same pure projections Whole Picture uses
  (`projectReviewRows`, `attachPictureCheckIns`, `restingByPeriod`) over the chosen window. `wholePictureQueries.ts`
  is unchanged.
- **His to change:** the window and Hide on any line, with Hidden (n) to bring lines back. Both are stored in
  `beyond:whatMovesPreference` and travel with the backup.
- **Calm and honest:** no score, colour, ranking, alert or advice. Every line names its days. The footer says these
  line up but don't prove a cause. Nothing feeds Delta, Weekly, TODAY or a recommendation. Many comparisons mean some
  clear lines will be chance; the floor, the bands and the footer keep that visible.
