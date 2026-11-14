# BODY-DASH-001 — DATA opens on the numbers (the first slice of BEYOND's new design language)

- **Authorization:** Gavin, 2026-11-14, "BODY-DASH-001 — Transformative Dashboard Implementation". This is an approved,
  bounded Protected change to DATA's primary information architecture, with your concept image as the visual North
  Star.
- **Lane:** Protected. It needs an independent exact-head review.
- **Start:** `5986d98a` (#510). **Builder / branch:** Claude Code; `ccr-88f5c085-body-dash`.
- **Open work checked:** #482 and #473 don't overlap.
- **Excluded:**
  - schemas and migrations, new dependencies, new Garmin import types;
  - Engine or recommendation changes, history changes;
  - TODAY, TRAIN, LIFE and MORE;
  - an app-wide redesign.
- **REUSE:**

  | Card | Existing pieces |
  |---|---|
  | Hydration | `paceReading` (SUIT-ALIVE S5), BODY's `handleLogWaterAmount`, `handleUndoLog("WATER")`, `WATER_QUICK_ADD_OZ` |
  | Sleep | `getMeasuredSnapshot` (GARMIN-003/004/005), `hypnogram`, `STAGE_COLORS`, BODY's `lastMainSleep` |
  | Steps, resting HR | `getMeasuredSnapshot` and its usual values; `MeasuredSheet` (today/7D/4W/1Y with a table) |
  | Weight | `getBodyweightHistory` |
  | Nutrition | `getFoodDiary` totals and the effective protein target |
  | Lifestyle | `getHabitWorkspace`, `getQuitSummary`, `HabitsPanel`, `QuitTracker` |
  | Logging, history | the app's LOG sheets (`openRecordSheet`), and BODY's Progress and sleep sheet for history |

- **OWN:**
  - `ui/screens/body/BodyDashboard.tsx` and `bodyDashboard.css`;
  - the pure helpers in `application/bodyDashboard.ts` (water by hour, weight change, Garmin freshness);
  - one read-only composition in `application/bodyDashboardQueries.ts`.
- **BUILD FROM SCRATCH:** none. Charts are hand-built SVG, as BEYOND's other charts are.

## What DATA shows now

1. **Header:** the "DATA" title, "BODY / HEALTH", a **LOG +** button that opens the existing LOG sheet, and the day
   strip (date and the lived day's context, e.g. "Night shift 18:00–06:00").
2. **Adaptive cards.** Hydration, sleep and lifestyle are full width; weight, nutrition, steps and resting HR are
   paired. Above 720 px of the dashboard's own width the grid has four columns.

   | Card | Shows |
   |---|---|
   | Hydration | Today's total, a bar per hour of the lived day with a NOW line and a 16:30–16:30 axis, your usual by now (or "learning"), and the last entry. The existing +8, +12 and +16 oz buttons, with undo. |
   | Sleep | Garmin's main sleep with its times, a stage bar and freshness; or your logged main sleep; or "Not logged". LOG SLEEP. |
   | Weight | Latest weight, the change against the weigh-in nearest a week before, a 30-day line, the goal only when set. LOG WEIGHT. |
   | Nutrition | Calories eaten and protein, with meters only against targets you set. Garmin's burned estimate in blue, never netted. LOG FOOD. |
   | Steps | Garmin's running total this lived day, its curve, and your usual for this kind of day. |
   | Resting HR | Latest reading, a 14-day line, your usual. |
   | Lifestyle | Today's habits (done or not yet) and the quit tracker, with HABITS AND QUIT opening the existing tools in place. |

   Each card's › opens its existing history: Progress for water, weight and nutrition; the sleep sheet; GARMIN-004's
   sheet for steps and resting HR.
3. **Shortcuts, then the cave:** DATA's shortcuts follow, unchanged except that the YOUR NUMBERS hero is gone (the
   header replaces it; Log weight and Sleep moved onto their cards). Then the cave, with all eight tabs unchanged.

**Sources:** "LOGGED" in white means your own records. "GARMIN" in Garmin blue means watch measurements, shown as
"GARMIN · OLD" plus "… h old" past 12 hours. Missing is "Not logged" or "Not measured", never zero.

## Visual comparison with the concept (rendered, `docs/agent/screenshots/BODY-DASH-001/`)

- **Matches:**
  - black-dominant cut-corner cards with a red top-left bracket;
  - the large condensed numerals and mono caps labels;
  - the compact header with DATA / BODY / HEALTH and a framed LOG +, and the day strip;
  - the sleep stage bar in Garmin's blue ramp, the blue steps curve and resting line;
  - the integrated quick-add row and lifestyle chips;
  - the cave below.
- **Deliberately different, for doctrine:**
  - no hydration ring or "% of 80 oz", and no step goal, because BEYOND has no goal you set for these;
  - no distance, which Health Bridge doesn't import;
  - weight's line is white (your logs), not red;
  - no "Garmin-integrated weight";
  - the cave's tabs keep their current text design (out of scope).
- **Gaps for later slices:** one shared D/W/M/Y metric page for every card (water and weight still use Progress's
  7/28/90-day view), and denser chart axes.

## Decision left to Gavin

The cave's NUMBERS tab still shows its own TODAY numbers and Weight card, which repeat the dashboard. Removing them
touches long-standing tested paths ("water history", "WEIGHT HISTORY", dated weigh-ins), so it was left out. The
recommendation is to trim NUMBERS to History in a follow-up.

## Visual acceptance pass (Gavin, 2026-11-14: "visual acceptance is not yet granted")

This continues on the same branch, with the reviewer's two BLOCK fixes kept: steps never show a fake 0, and there is
no "0 kcal" eaten.

| Finding | Change |
|---|---|
| A. Header collisions | Narrow cards keep only the icon, the label (breaking between words only, e.g. "RESTING / HR") and ›. The source tag and + move to a second row. A collision check (no two header parts overlap, nothing spills out of a card) runs at 320–1024 px, and also with long values and names at 320 px, as a stand-in for zoom. |
| B. Desktop | At most two columns. The four-column rule is gone. The app shell keeps DATA at phone width, so 768 and 1024 px show the same readable two columns, centred. |
| C. Density | The full-width LOG buttons became a + in each card. Padding, gaps and chart heights are tighter. The second DATA title is gone. The first 360 × 800 screen now shows the command bar plus the whole of hydration and sleep (was: hydration only). The dashboard is about 130 px shorter. |
| D. Identity | Primary cards (hydration, sleep) have a red frame, a faint red wash and 46 px numerals. Secondary cards use 30 px numerals and a grey frame, with the red bracket on every card. Hydration's number sits beside its chart (faint guides, ticks, a red NOW line). Sleep shows the times with a red →, a 14 px stage bar and a stage-minute key. The command bar opens with a red "///". |
| E. Header | The global DATA header stays. The second "DATA" title is removed. One framed command bar carries "/// BODY // HEALTH", the date, the shift context and LOG +. A hidden "Your numbers" h2 keeps the heading order. |
| F. Lifestyle | No inline form. HABITS › opens YOUR LIFE, where Habits live; QUIT TRACKER › opens the existing quit tracker in LOG. |
| G. The cave's duplication | Documented below and not changed. |

**Contrast:** secondary text now uses a contrast-safe quiet tone, because the no-day palette failed AA with plain
`--p-t2`. Full axe AA, including contrast, passes in every rendered state.

Screenshots (`screenshots/BODY-DASH-001/`):
- `body-dash-360-open.png`, the first phone screen;
- `body-dash-360-full.png`;
- `body-dash-412.png`, `body-dash-768.png`, `body-dash-1024.png`;
- `body-dash-320-long.png`, long values and names;
- `body-dash-360-water-undo.png`, `body-dash-360-steps-sheet.png`, expanded states.

### Remaining differences from the concept

- **Intentional, for doctrine:**
  - no hydration ring or "% of goal", and no step goal (no target exists);
  - no distance (not imported);
  - weight's line is white (your logs);
  - no separate HR card beyond resting HR;
  - the concept's top tab bar (TODAY / DATA / LIFE / FIELD) is not adopted, because the primary navigation is out of
    scope.
- **Intentional, for scope:** the cave's tabs keep their text design (out of scope), and BEYOND's emblem stays.
- **Unresolved, for later:**
  - one shared D/W/M/Y metric page for every card (BODY-DASH-002);
  - richer chart axes on secondary cards.
- **Pre-existing, not changed:** DATA's shortcut list below switches to four columns at a 760 px window inside the
  phone-width shell ("Measur ements"). The rule is shared with MORE and YOUR LIFE (`systemsHome.css`), so its fix
  belongs in a small shared-layout follow-up.

### Smallest safe follow-up for the cave's NUMBERS duplication

NUMBERS still shows TODAY's tiles and the Weight card above History. The smallest safe change is to collapse those
two into one quiet "Today's readings" disclosure in NUMBERS (closed by default) and keep History as is. This keeps
every control the history and correction tests use ("water history", "WEIGHT HISTORY", dated weigh-ins), so nothing
is removed. It's a separate PR for Gavin's go.
