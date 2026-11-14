# HARVEST-001 — Capability Harvest 001 (whole product)

- **Protocol:** [CHP-001](../CHP-001.md). **Date:** 2026-11-14.
- **Repository state inspected:** master `e1209287`, with #517 (TODAY) open and the MORE and cave foundation on a
  branch.
- **Owner decision:** "Capability Harvest 001 is accepted as our research baseline", with two refinements:
  - METRIC-PAGE-001 starts as a hydration and steps pilot;
  - lifestyle-logging parity stays an active opportunity (see the follow-up section below).
- **Source:** the published report (claude.ai artifact "Capability Harvest 001"). This file preserves it in the
  repository.

Throughout, **[V]** marks a finding verified against code or a primary source, **[R]** a recommendation, and
**[Q]** an unresolved question.

## 1. Verified capability inventory

Paths are under `src/`, read at `e1209287`.

**BODY, health and nutrition**
- **[V] Dashboard:** the numbers-first dashboard (`ui/screens/body/BodyDashboard.tsx`), and the cave's eight views
  (`ui/screens/systems/Cave*.tsx`).
- **[V] Garmin, watch-only,** through the Health Bridge files (`application/healthSync.ts`,
  `externalActivityCommands.ts`, `externalSleepCommands.ts`). Owner entries win.
- **[V] Your own baselines:** `engine/personalBaselines.ts`, `application/pace.ts`, the unusual labels and the dim
  "steady" state.
- **[V] Nutrition:** USDA lookup (`foodLookupQueries.ts`), barcode, saved meals, same-as-yesterday, meal plan, and
  targets (`engine/nutritionTargets.ts`).
- **[V] Expenditure:** `engine/expenditure.ts` gives a Hacker's Diet range, shown in Weekly only and never fed into a
  target.
- **[V] Other records:** weight, measurements, on-device progress photos, and the quit tracker with money saved.
- **[V] Five detail views for one metric:** `MeasuredSheet`, `SleepMetricSheet`, the cave's VITALS,
  `InsightsExplorer` and `WeightDetails`.

**TRAIN**
- **[V] Plans:** templates and custom templates with supersets, and a programme by weekday or by work day and day
  off.
- **[V] Engine:** progression and the training suggestion.
- **[V] In the gym:** gym mode, the rest timer, plate and warm-up maths (`ui/screens/train/plates.ts`), and previous
  values shown inline.
- **[V] Progress:** personal records, e1RM and the strength curve, muscle sets per week
  (`ui/screens/review/StrengthAnswers.tsx`), and history.
- **[V] Gap:** a set stores only weight, reps and skipped (`domain/workout/types.ts:199`), so there's no effort
  rating or set type.

**TODAY**
- **[V] The lived day:** 16:30 to 16:30, with the shift clock, mode pin and day map.
- **[V] State:** the operating-state band and the week strip.
- **[V] The next step:** the Engine recommendation and capacity, and the check-in.
- **[V] Shift tools:** what-if, the week energy forecast, the circadian plan with caffeine and light timing
  (`application/shiftSleepPlan.ts`), shift change and shift down, the recovery contract, preparation and routines.
- **[V] Calendars:** Google Calendar (read-only) and the family calendar.

**YOUR LIFE**
- **[V] Areas:** the whole-life cockpit, projects, people, and home upkeep (a view only).
- **[V] Habits:** schedules ANY_DAY, WEEKDAYS, WORK_DAYS or DAYS_OFF (`domain/habits.ts`).
- **[V] Notes:** journal, daily note, links with backlinks (`components/Connections.tsx`), highlights, collections,
  time capsule, snippets and the shared inbox.
- **[V] No finances.** The only money figure is the quit tracker's "money saved" (`domain/common/types.ts:625`).

**COMMAND, Alfred and memory**
- **[V] Alfred:** proposal cards that you confirm (`application/alfred/alfredActions.ts`), memory, and personal
  context.
- **[V] Understanding:** DELTA (`application/delta.ts`) and "what moves the needle" (`application/needle.ts`).
- **[V] Finding and automating:** search, the command screen, and IFTTT-style automations.
- **[V] Deferred by owner ruling:** on-device Alfred and voice.

**Visual system**
- **[V] On the foundation (`ui/foundation/`):** BODY and TRAIN (#515, #516). TODAY is in #517. MORE and the cave
  are VISUAL-FOUNDATION-004.
- **[V] Not yet on the foundation:** the live workout, the LOG sheets, the check-in sheet, REVIEW and the Alfred
  sheet.

## 2. Reference research matrix

Most claims are from each product's own documentation; third-party reviews are marked. No proprietary formulas are
claimed.

| Reference | What it does well | Licence / use | Sources |
| --- | --- | --- | --- |
| Apple Health | One page per metric (H/D/W/M/6M/Y) with an average; Trends compare your last 90 days with your last 365, after 180 days of data | Proprietary: ideas | [9to5Mac](https://9to5mac.com/2022/01/14/apple-watch-heart-rate-history/), [Macworld](https://www.macworld.com/article/3429077/ios-13-and-apple-watch-activity-trends-give-you-the-big-picture.html), [leancrew](https://leancrew.com/all-this/2024/11/apple-health-trends/) |
| Garmin Connect | Health Status against your own baseline (3–4 weeks to build), blue inside and orange outside; configurable Morning Report; lifestyle logging | Proprietary | [Health Status](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-6335963E-C254-4239-9450-A0212850F303.html), [Morning Report](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-4D26FDDC-63BD-4910-95B8-98937FEC2545.html), [DC Rainmaker](https://www.dcrainmaker.com/2025/09/lifestyle-logging-journaling-health-status-vs-whoop-everything.html) |
| Oura | Population averages first, then your own baseline; a 30-day view separate from all-time trends | Proprietary | [Oura help](https://support.ouraring.com/hc/en-us/articles/25889225853587) |
| Hevy | Optional RPE on each set; set types (warm-up, drop, failure, normal); warm-ups out of stats; previous values inline | Proprietary | [Set types](https://www.hevyapp.com/features/workout-set-types/), [settings](https://help.hevyapp.com/hc/en-us/articles/33882110558743) |
| Strong | Rest timer that starts itself, plate and warm-up calculators, 1RM chart, CSV export | Proprietary | [App Store](https://apps.apple.com/gb/app/id464254577), [review (third party)](https://repreturn.com/strong-app-review/) |
| MacroFactor | Expenditure from weight and intake; weekly check-in proposes a target you can decline; adjustments smoothed | Proprietary; the energy-balance concept is public | [Check-ins](https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules), [V3](https://macrofactor.com/expenditure-v3/) |
| Cronometer | Daily nutrient report, highlighted targets you choose, contributing foods | Proprietary | [Daily Report](https://support.cronometer.com/hc/en-us/articles/32689033683220) |
| Loop Habit Tracker | Habits a number of times per week; skips don't count against you; habit-strength score | GPL-3.0: ideas only | [GitHub](https://github.com/iSoron/uhabits), [score](https://github.com/iSoron/uhabits/discussions/689) |
| Gentler Streak | Rest days never break a run; sick or away status; guilt-free | Proprietary | [Digital Trends](https://www.digitaltrends.com/?p=3165528) |
| Actual Budget | Local-first envelope budgeting, on-device database, optional sync and end-to-end encryption | MIT: can adapt with attribution | [Vision](https://actualbudget.org/docs/vision/) |
| Obsidian | Daily notes from templates, backlinks, Dataview queries | Proprietary; plugins licensed separately | [itsfoss](https://itsfoss.com/obsidian-plugins/) |
| Home Assistant | Tile cards, conditional cards, area grouping | **[Q]** licence not confirmed | [Conditional card](https://www.home-assistant.io/lovelace/conditional/) |
| Gadgetbridge, wger | An open-source health dashboard; an open exercise and ingredient database | Gadgetbridge AGPL-3.0; wger code AGPL, data CC per entry | [Gadgetbridge](https://gadgetbridge.org/basics/features/activities/), [wger](https://cdn.jsdelivr.net/gh/wger-project/wger@master/README.md) |
| Timeshifter, Arcashift | Shift-work plans for sleep, light, caffeine and naps from your roster | Proprietary | [Healthify](https://healthify.nz/apps/t/timeshifter-shift-work-app), [study](https://scholarlycommons.henryford.com/sleepmedicine_mtgabstracts/101) |

## 3. Ranked capability gap backlog

Scores run 1–5: U is daily usefulness, E is effort (5 = least), I is integration, R is risk (5 = safest), V is
visual gain and D is doctrine fit.

| # | Opportunity | Class | BEYOND today → [R] recommendation | U E I R V D |
| --- | --- | --- | --- | --- |
| 1 | One metric page, used everywhere | REFINE | Five detail views for one number → one page shape with D/W/M/Y, usual, work vs off, sources and records, opened from every tile. **Approved as a hydration and steps pilot.** | 5 2 5 4 5 5 |
| 2 | Set effort and set types | MISSING | Weight and reps only → optional reps in reserve; warm-up and drop marking. Engine use is a separate ruling. | 5 3 4 3 3 5 |
| 3 | Calorie target proposal | REFINE | The expenditure readout only → a weekly proposal you save or skip, smoothed. | 4 3 5 4 3 4 |
| 4 | "N a week" and "per run" habits | MISSING | Four fixed schedules → a per-week schedule and a per-shift-run schedule. | 4 4 4 4 2 5 |
| 5 | Readable export (CSV) | MISSING | JSON backup only → CSV per area. | 3 5 3 5 1 5 |
| 6 | Fiber and sodium | MISSING | Calories and macros only → keep them from USDA; targets only if you set them. | 3 3 3 4 2 5 |
| 7 | 90-day direction | MISSING | None → one sentence on the metric page after 180 days; never a score. | 4 4 4 4 3 5 |
| 8 | Live workout on the foundation | REFINE | Older look → bigger numerals and framed exercise panels, same flow. | 4 3 2 4 5 5 |
| 9 | Money (envelopes) | MISSING | Quit tracker savings only → report-only discovery first. | 3 1 3 3 3 4 |
| 10 | Nutrient contributors | REFINE | Totals → tap to see the meals behind them. | 3 4 4 5 2 5 |
| 11 | Remaining sheets on the foundation | REFINE | LOG, check-in, REVIEW, Alfred. | 3 4 2 5 4 5 |
| 12 | Warm-up sets out of stats | REFINE | Comes with #2. | 3 4 3 4 1 5 |
| 13 | On-wake report | EXISTING | BRIEF, COMMS, TONIGHT and "since you last looked". | — |
| 14 | Judged against your own baseline | EXISTING | Usual ranges, pace, unusual labels, steady dimming. | — |
| 15 | Previous values, e1RM, plates, supersets, muscle sets | EXISTING | TRAIN. | — |
| 16 | Shift sleep, light and caffeine plan | EXISTING | `shiftSleepPlan.ts`. | — |
| 17 | Backlinks, daily notes, templates | EXISTING | Connections, daily note, snippets. | — |
| 18 | Habits linked to data | EXISTING, **reopened** | Tag patterns and the needle exist, but the interaction parity check in section 6 finds real gaps. | — |
| 19 | Habit strength score | REJECT | A score and a source of streak pressure. | — |
| 20 | Readiness, Body Battery, sleep scores | REJECT | Scores replace facts and compete with the Engine. | — |
| 21 | HRV and breathing-rate import | REJECT | Outside the approved Garmin scope. | — |
| 22 | Push alerts, predicted fatigue | REJECT | Need a backend; create urgency; would act as recommendations. | — |
| 23 | Graph view, social feed, population ranges | REJECT | Noise; BEYOND compares you only with yourself. | — |
| 24 | Smart-home control | REJECT | A new external system; HOME-001 is a view. | — |

## 4. Mission sequence [R]

0. Merge #517 (TODAY), and review and merge VISUAL-FOUNDATION-004 (MORE and the cave).
1. **METRIC-PAGE-001.** The pilot covers hydration and steps (approved). The rest follow after the pilot is
   reviewed and approved.
2. EXPORT-001: CSV.
3. HABIT-RHYTHM-001, together with lifestyle-logging parity (section 6).
4. SET-EFFORT-001.
5. TARGET-PROPOSAL-001.
6. GYM-FOUNDATION-001.
7. NUTRIENTS-001.
8. MONEY-DISCOVERY-001, report only.

## 5. Visual evolution strategy [R]

Keep the emblem, layout, five tabs and the foundation. Add materials and light, not decoration, as tokens and
primitives in `ui/foundation/`:

1. **Layered materials:** the ground; a plate; an inset readout well with a 1 px top highlight.
2. **Instrument lighting:** one `data-lit` state, where readings inside your normal sit at about 72% and readings
   outside it are fully lit. TODAY's steady dimming already does this.
3. **Circuitry:** one static 1 px trace with nodes, used only as the command bar's lower edge and a panel's header
   divider.
4. **Selective blue:** Garmin blue only for the watch.
5. **Neo-Gotham atmosphere:** the skyline as TODAY's horizon. A faint red sky on DATA's first screen would need
   Gavin's go.
6. **Density and motion:** container-query density, and no motion beyond what exists.

Screens with the most to gain: the live workout, the LOG sheets, the check-in, REVIEW, Alfred. FILE's run table and
MONTH's grid are recorded exceptions.

## 6. Follow-up: lifestyle-logging interaction parity

Owner direction: "That classification is not sufficient to establish interaction parity." Below, BEYOND is
inspected against Garmin's lifestyle logging.

**Garmin, from primary sources where available**
- **[V]** Behaviours are grouped into categories, can be custom, and are set as daytime or sleep-related and as a
  single or multiple event.
- **[V]** Optional logging reminders exist.
- **[V]** Reports show how behaviours line up with sleep, stress and HRV
  ([Garmin manual](https://www8.garmin.com/manuals/webhelp/GUID-3A4F9C4A-8735-46C0-8DA9-65F11400B150/EN-US/GUID-756C5C3F-7C01-4F14-9565-3AD04C2C865A.html),
  [Garmin blog](https://www.garmin.com/en-AU/blog/?p=3818)).
- **[Q]** The exact daily Yes / No / unrecorded control, and 7-day and 28-day views, were not confirmed in primary
  sources. One user describes 4-week and 12-week report tabs
  ([forum](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-mobile-ios/430497/where-are-the-lifestyle-logging-reports)).
  Reviewers call the analysis shallow
  ([the5krunner](https://the5krunner.com/2025/10/06/garmin-lifestyle-logging-fails-to-take-on-whoop/)).

**BEYOND today**

| Capability | BEYOND today (verified in code) | Gap |
| --- | --- | --- |
| **Daily answer** | `HabitsPanel.tsx`: one toggle, MARK DONE or DONE (`HABIT_SET {done}`). A habit not marked is indistinguishable from "didn't do it" and from "didn't record". The quit tracker logs a clean day with a hold, and an unmarked day "simply isn't counted". | **MISSING:** an explicit "No" separate from unrecorded. That matters for honest comparisons (DENSITY-001's "missing isn't zero"). |
| **7-day overview** | Counts only: "N this week · N in 4 weeks" (`habitQueries.ts`). BODY's Lifestyle panel shows today's state only. | **MISSING:** a 7-cell row per habit (done, no, not recorded, not scheduled). |
| **28-day history** | No grid for habits. The quit tracker shows "clean this month" as a count. | **MISSING:** a 28-day grid on lived days, with work days marked. |
| **Past corrections** | `setHabitDone(habitId, done, dayId?)` accepts a past day, but the UI only marks the current lived day. After the 16:30 rollover, last night's habit can't be fixed from the app. | **MISSING (UI only):** mark or unmark a past lived day from the grid. The command already exists. |
| **Links to health** | `needle.ts` compares #tags and training against check-in energy over judged weeks, as a pattern and never advice. Habits from the Habits panel are not part of it, and nothing compares behaviours with Garmin sleep or resting heart rate. | **REFINE:** include tracked habits, and compare against sleep and resting HR. It ranks, so it's Protected. |
| **Reminders** | REMIND-001 covers the check-in only. | **REJECT for now:** urgency and no backend. A later question for Gavin. |

**[R] Next mission shape:** fold this into HABIT-RHYTHM-001, which reuses `HABIT_SET`, the existing habit records and
lived days. It needs no new subsystem: one habit system with three states (done, no, unrecorded), a 7-day row, a
28-day grid with past-day correction, per-week and per-run schedules, and then the needle including habits (needs
Protected approval).

**[Q] For Gavin:**
- Should the quit tracker's clean-day log adopt the same three states, or keep "an unmarked day isn't counted"?
- Should reminders stay out?
