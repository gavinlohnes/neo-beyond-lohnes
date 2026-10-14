# REVIEW-001 — Data review that answers your questions (design brief, proposed)

**Status: design proposal for owner approval. No implementation is authorized by this file.**
Gavin approved the design pass on 2026-10-14 ("yes, do the REVIEW-001 design pass, both weekly and
always-on"). Builder for the design pass: Claude Code. Starting master: `53fcf68`. Implementation
needs Gavin's separate approval of the phases below; Phase 1 is proposed as **PROTECTED** (a new MORE
destination that changes how existing analytics are composed, and new read-only calculations).

Mockups (illustrative data, 390 px): [`docs/screenshots/review-001/`](../screenshots/review-001/).

## Goal

Gavin's goals are to lose weight, get stronger, and look visibly more muscular. BEYOND already
records most of the evidence, and many of the analytics already exist. They are spread across Weekly
(Ribbon, findings, your usual, Mirror, expenditure, heat grid), BODY (insights, weight trend, timeline),
TRAIN (strength curves, PR cards) and MORE (Report, the Recommendation Ledger). None of these is a
single place that answers "how am I doing?". REVIEW-001 makes one: **Review**, organized around
questions, with two ways in.

- **Always-on.** Open any time. Each question has a one-sentence answer, a small chart, and a detail
  view with the evidence behind it.
- **Weekly review.** A short guided pass of 6 steps, about 3 minutes, offered once a week on a chosen
  day off. It ends with your own notes and an optional focus for next week that you pick yourself.

## The questions

Key: **Now** = answerable from existing records and calculations. **Derive** = needs a new read-only
calculation over existing records. **New data** = needs something BEYOND does not record yet (Phase 2).

### Losing weight
| # | Question | Source |
|---|---|---|
| 1 | Is my weight actually going down (trend, not daily noise)? | Derive: 7-day average over existing weigh-ins |
| 2 | How fast: lb per week and % of bodyweight per week? | Derive |
| 3 | When will I reach my goal weight at this pace? | Now (`projectGoalDate`) |
| 4 | How much do I normally swing day to day? (so one bad morning isn't scary) | Derive |
| 5 | Am I eating what I planned? Days on calorie target, average intake | Now / derive (logged days only) |
| 6 | Am I hitting protein? Days at target, average | Now (Weekly) |
| 7 | How much am I really burning? | Now (expenditure readout, Weekly) |
| 8 | Do work days and days off differ (weight, eating, sleep)? | Derive (declared work context) |
| 9 | Is my waist getting smaller? | New data: measurements |

### Getting stronger
| # | Question | Source |
|---|---|---|
| 10 | Am I getting stronger overall? | Derive: strength index from estimated max |
| 11 | Which lifts are progressing, and which have stalled? | Now (stall finding) + derive |
| 12 | Am I keeping or gaining strength while I lose weight? | Derive: weight trend next to strength index |
| 13 | How strong am I relative to my bodyweight? | Derive |
| 14 | What records did I set this week or month? | Now (PR rule) |
| 15 | Am I progressing the way my plan intends (top of rep range before adding weight)? | Now (progression) |

### Looking more muscular
| # | Question | Source |
|---|---|---|
| 16 | Am I losing fat and not muscle? | Derive (weight + strength); clearer with new data (waist, photos) |
| 17 | Is each muscle group getting enough hard sets per week? | Derive: sets per muscle group (needs a muscle mapping for template exercises) |
| 18 | Is my training balanced: push vs pull, upper vs lower, shoulders and arms? | Derive |
| 19 | Is my weekly training volume growing over time? | Derive |
| 20 | Do I look different? Side-by-side progress photos | New data: photos (local only) |
| 21 | Are my chest, arms and shoulders growing? | New data: measurements |

### Recovery and consistency
| # | Question | Source |
|---|---|---|
| 22 | Am I training consistently? Sessions per week, longest gap | Derive |
| 23 | How does sleep relate to my workouts? | Now (finding) |
| 24 | How do night shifts affect training, eating and sleep? | Now (findings) + derive |
| 25 | How have I been feeling over time? | Derive (check-in trend) |
| 26 | How complete is my logging, so I know which numbers to trust? | Derive |

### Review and reflection
| # | Question | Source |
|---|---|---|
| 27 | What happened this week, compared with last week? | Now (Weekly) |
| 28 | What did I write, and what did I choose to focus on, and how did it go? | New data: weekly note and focus (Phase 3) |

## Rules every answer follows (from doctrine and locked decisions)

- **Facts and patterns, never a grade.** No scores, streaks, red "bad" colors or guilt copy. Charts use
  neutral ink. Red stays reserved for earned significance (the existing PR tag) and the primary button.
- **Confidence matches evidence.** Every answer names its window and how many records it came from.
  Below a floor it says what is still needed ("Needs 3 sessions of the same lift. You have 0."), never
  a guessed chart. Partial logging is never presented as total intake, and missing data stays missing.
- **Counts, not causes.** For example: "Days off read about 1.2 lb higher than work days. That is a
  count, not a cause." This follows the findings rule that excludes "usually", "tends to" and "because".
- **Inspectable.** Every number can be tapped to show how it was calculated and the records behind it.
  Charts are inline SVG with an accessible text summary, tap-to-inspect points, and a table alternative.
- **No new authority.** Review is read-only. It does not recommend, does not feed the Engine, and does
  not change TODAY. The weekly focus is the operator's own choice and is labeled "Your choice, not a
  recommendation."
- **Review is a COMMAND surface** (deliberate deep work), so TODAY stays calm. The only TODAY presence
  would be a quiet "Weekly review ready" line on the chosen review day, which needs owner approval.

## Design (see mockups)

1. **Review home (always-on).** A weekly-review card (shown when one is ready), two goal tiles
   (weight trend and strength index), then question rows: question, one-sentence answer, mini chart.
   Questions without enough data move to a "Building up" group that shows progress toward the floor
   (mockup 8 is close to Gavin's real state today).
2. **Question detail.** The answer sentence, range chips (4 W / 8 W / 6 M / ALL), one chart, 2–4 stat
   tiles, a count-not-cause note, "How this is calculated", and "Every record in this range".
3. **Weekly review.** Steps: the week → weight → strength → muscles → fuel and recovery → your notes.
   Each step reuses the matching detail view, compared with last week. LATER keeps it ready.

Chart rules: one y-axis per chart. Weight and strength are two stacked charts, never a dual axis. Thin
2 px lines, hairline grid, the latest value labeled directly, and daily points muted under the trend.

## Proposed phases

**Phase 1 — Review hub and weekly review on existing data** (PROTECTED; no schema change).
- New MORE destination "REVIEW" plus a SYSTEM catalog entry. Weekly, Mirror and findings content is
  reused inside it, and the existing screens stay reachable until Gavin rules on consolidation.
- New pure read-only calculations (in `engine/`, unit-tested, never used by `evaluate`):
  - 7-day weight average and daily swing;
  - rate per week as lb and as a percentage;
  - estimated max (Epley) per lift and a strength index;
  - relative strength;
  - hard sets per muscle group per week, with a muscle-group mapping for built-in template exercises
    and reuse of the custom exercises' existing `muscleGroup`;
  - push/pull and upper/lower balance;
  - consistency;
  - logging coverage.
- Abstain floors per question, written into tests.
- Leverage gate: **BUILD OWNED** inline SVG, reusing the existing timeline/strength-curve pattern. No
  charting dependency (Recharts stays eligible-but-not-adopted unless a named need appears).
- The weekly review in Phase 1 is read-only. Notes and focus arrive in Phase 3.

**Phase 2 — Body composition evidence** (PROTECTED; additive schema, backup contract).
- Weekly measurements: waist first; chest, arms, shoulders and hips optional.
- Optional progress photos stored only on the device. This affects backup size and privacy, and the
  backup format needs an explicit decision.
- Feeds questions 9, 16, 20 and 21.

**Phase 3 — Reflection** (PROTECTED; additive schema). This ties into JOURNAL-002.
- A weekly note and an operator-chosen focus, stored as events.
- Next week's review shows how the focus went, as a count.
- Journal entries and Captures from the week appear beside the numbers.

## Decisions for Gavin

1. **Approve Phase 1 implementation** as scoped above (PROTECTED: independent exact-head review, green
   CI, your merge approval).
2. **Reference ranges.** Show common guidance as a quiet band next to *your usual*, or show only your own
   data? Examples: losing 0.5–1% of bodyweight per week, or 10–20 hard sets per muscle per week. These
   are general guidance, not BEYOND's judgment, and would be labeled with their source.
3. **Weekly review day and the TODAY line.** Which day? Should TODAY show a quiet "Weekly review ready"
   line on that day? That is a TODAY composition change.
4. **Consolidation.** Once Review exists, should Weekly, Mirror and findings live only inside Review
   (simpler MORE), or stay as separate entries too?
5. **Phase 2 photos.** Do you want progress photos at all, given they stay on the device and make
   backups larger?

## Acceptance evidence (Phase 1)

- Unit tests for every calculation and abstain floor, including ones built from the protected fixtures,
  read only.
- Browser tests through `<App />` at 320/360/412 px: axe, reduced motion, tap-to-inspect, keyboard,
  and the "Building up" states.
- A production-build acceptance script with screenshots.
- No Engine/`evaluate` change, no event or schema change, and no new dependency.
