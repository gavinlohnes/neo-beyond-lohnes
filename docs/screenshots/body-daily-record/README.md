# BODY Daily Health Record — browser evidence

Actual production UI rendered in Chromium with isolated synthetic IndexedDB profiles; no real
operator data. Viewports are 320, 360 and 412 CSS px × 800, with reduced motion enabled. Capture
finishes finite entrance effects, loads local fonts, and uses the real canonical application
commands. Full-page captures include the fixed four-tab navigation.

- Daily record: [320](daily-320.png), [360](daily-360.png), [412](daily-412.png).
- [Existing focused meals](meals-360.png): canonical saved meals, primary calories/protein,
  secondary carbs/fat and preset management; manual entry and online lookup are preserved.
- [Inspect a consumed meal](inspect-meal-360.png): original canonical correction form.
- [Progress](progress-360.png) and [existing personal baselines](usual-360.png).
- [Accomplishments without weight](accomplishments-no-weight-360.png): actual recorded workouts/PR,
  no weigh-in prerequisite or empty weight chart. No new inference, scoring or punitive streaks.

Daily sample: one 600 kcal / 45 g dinner, 16 oz water, 6 hr 40 min main sleep and a separate
20-minute nap. The dated latest weight is 210 lbs. Progress uses two completed synthetic workouts,
with one real deterministic PR. The no-weight scene uses a fresh profile with only those workouts.

Browser checks confirmed no horizontal overflow and the quick water controls above the fixed
navigation at all three widths. Automated tests additionally cover full contrast/accessibility,
keyboard focus, overnight day ownership, canonical correction/totals, draft retention, read-only
retry, same-tick write guards and the existing meal journey. A separate built-PWA run verifies
offline save/log/return/reopen/undo/correction and cold reload retaining effective totals.

To review locally: check out this PR, use the existing lockfile (`npm ci` if dependencies are not
already installed), then `npm run dev`. Open `http://localhost:5173/neo-beyond-lohnes/`, choose BODY.
For a phone on the same trusted local Wi-Fi, use the computer's LAN IP instead of localhost; Vite
already listens on all interfaces. This is a local preview, not a deployment. Use a separate
browser profile/origin for sample data. Existing IndexedDB is origin-specific and remains intact.

Current data limit: canonical meals have no fiber field, so BODY explicitly says it is not
recorded. No one-off logger, package, schema, Engine, event, backup or storage changes are included.
