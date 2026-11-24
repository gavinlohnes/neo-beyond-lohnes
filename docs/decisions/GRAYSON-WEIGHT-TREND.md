# GRAYSON-WEIGHT-TREND — a smoothed trend weight beside the scale weight (owner go, 2026-11-24)

Gavin merged the [brief](../agent/GRAYSON-WEIGHT-TREND-001.md) (#648), which approves these defaults.

- **The trend:** an exponential moving average of his weigh-ins (The Hacker's Diet), 10% per day ("Steady"). After a
  gap of g days the new weigh-in counts 1 − 0.9^g (elapsed time, not calendar days). The last weigh-in of a local
  day counts. It starts from his first weigh-in and shows to one decimal, in pounds.
- **When it shows:** after 5 weigh-ins (one per local day) spread over at least 7 calendar days. Before that:
  "Trend shows after 5 weigh-ins over a week".
- **Where:** wherever BODY's `WeightTrend` draws its chart (the weight card and the weight metric sheet): "Trend
  184.3 lb · scale 183.6 lb Nov 22", and a second, lighter, long-dashed line in the same neutral ink. The aria label
  names both lines. The facts-only use (`hideChart`) shows none of it.
- **His to change:** Show trend On/Off (Off draws the chart exactly as before) and Smoothing Steady (10%) or
  Quicker (20%). One localStorage preference, `beyond:weightTrendPreference`, travelling in the backup.
- **Unchanged:** best-since, milestones, the goal projection, expenditure, Weekly and the Engine keep reading the
  scale weigh-ins. Moving any of them onto the trend needs his OK.
- **Calm:** no up/down colour, arrows, score or "you gained" copy; no warning when the trend moves away from the goal.
- **Says why:** "What's the trend?" — "Your weigh-ins averaged so one day's water or salt barely moves it. It only
  moves when your weight really does."
