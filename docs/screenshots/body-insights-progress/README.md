# BODY Insights & Progress — mobile evidence

Actual production PWA screenshots in system Chromium 151, 320/360/412 × 800 px,
reduced-motion contexts. Each width has eight views, plus one empty-state capture at 320 px.
Synthetic 60-day history was created through canonical application commands in an isolated
browser, exported through the existing backup action, and restored through the actual native
preview/confirm/automatic-safety-backup workflow into isolated test contexts. No user records,
protected fixtures, prototype #204 code or prototype sample values were modified.

- `daily-record-*`: existing daily overview and manual controls remain the entry surface.
- `weight-progress-*`: 28-day weigh-in average, dated raw observations and neutral graph.
- `weight-inspection-*`: keyboard Home selects the first actual observation with a dated value.
- `nutrition-*`: seven-day recorded meal-calorie view; protein remains a primary snapshot metric.
- `sleep-*`: main-sleep records only; naps and ambiguous multi-main-entry days are excluded.
- `training-*`: COMPLETED/PARTIAL workouts per recorded lived day; absent days are not rest days.
- `coverage-*`: meal carb/fat detail, explicit missing fiber and descriptive co-recording evidence.
- `offline-progress-*`: restored history retained through a service-worker offline cold reload.
- `empty-progress-320`: no weight/history is invented; other controls remain available.

At all widths: no horizontal overflow; successful canonical native-backup restoration; keyboard
point inspection; offline cold reload; local measure/range changes; explicit DAILY RECORD return
with focus restored to YOUR PROGRESS; existing manual water entry and UNDO. Regression suites
add full axe/contrast, reduced motion, 44px controls, read failure/pending retry without stale data,
existing meal/draft/correction/undo flows and goal/timeline behavior.

## What the figures mean

7/28/90 rolling ×24-hour windows, ending at the displayed read timestamp. Weight uses recording
timestamps; other measures retain the canonical lived-day owner and its start time, including
overnight work. Means divide by available observations, not all elapsed days. A recorded zero is
included; no entry stays missing. Comparisons use the immediately preceding non-overlapping
equal-length range and expose both sample counts. Values are rounded for display; calculations
use the underlying recorded values. Different logging coverage can change a mean;
recorded meal calories are not measured total intake, and active days may be partial.

Weight lines connect observations, not measurements between dates; other series stop across
gaps longer than 36 hours. Point/record inspection is an equivalent text route, not color-only
meaning. Existing goal, milestone and projected-date rules remain unchanged; no recommendation,
medical advice, inferred correlation, new goal or persisted analytic record is introduced.

## Limits and useful next steps

Chromium automation is not physical-device/iOS/Safari or native assistive-technology certification.
Native picker/share-sheet behavior still needs device testing. Calculation/query coverage uses
the existing correction-aware [Day Ledger](../../../src/application/dayLedgerQueries.ts) and
[meal history](../../../src/application/nutritionQueries.ts), with a small
[read-only composition](../../../src/application/bodyInsightsQueries.ts). Up to two 90-day windows
are composed; range/metric/point exploration is local and does not refetch or write. Existing
ledger/Weekly sources still read all history; no performance guarantee for arbitrarily large
backups or physical phones is claimed. Existing bundle-size warning remains.

Fiber capture needs a separately approved compatible schema/input objective; it is not estimated
from calories/macros. Field feedback should determine which comparisons are useful before adding
more graphs or stronger interpretations. Required exact-head CI and independent review belong
in the linked PR. The Builder does not merge or deploy.
