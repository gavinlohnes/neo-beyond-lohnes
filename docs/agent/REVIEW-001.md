# REVIEW-001 — Data review that answers your questions (approved plan)

**Status:** plan approved by Gavin on 2026-10-14. Phase 1a implementation starts after this brief
merges. Phases 1b and 2 each need their own go-ahead.

- **Builder:** Claude Code.
- **Design-pass starting master:** `53fcf68`. Each implementation PR records its own exact starting commit.
- **Lane:** **PROTECTED** for Phase 1a. It adds a new MORE destination, a quiet TODAY line, new
  read-only calculations, and additive storage for measurements, photos and the weekly focus. That
  storage changes the schema and the backup contract.

Owner rulings (2026-10-14):
1. **Design pass:** approved, covering both an always-on Review and a weekly review.
2. **Weekly review on Mondays,** with a quiet visual on TODAY.
3. **Weekly check-in stays** as its own screen alongside Review.
4. **Progress photos: yes.**
5. **Reference ranges:** discussed. Approved approach: targets the operator sets, informed by cited
   guidance (option C), shipped as a follow-up (C2). Until then, Review compares against *your usual*,
   with guidance available on request.
6. **Revised plan approved:**
   - baseline capture early;
   - weekly reviews for habits, monthly reviews for the body;
   - the focus loop early;
   - Phase 1 split into 1a/1b;
   - a core-six home.

Mockups from the design pass (illustrative data, 390 px): [`docs/screenshots/review-001/`](../screenshots/review-001/).
They show the layout and chart language. The home screen's question order is superseded by the core six below.

## Goal

Gavin's goals are to lose weight, get stronger, and look visibly more muscular. His stated motivation
is accountability and good data to review.

BEYOND already records most of the evidence, but its analytics are spread across several screens:
- Weekly: Ribbon, findings, *your usual*, Mirror, expenditure, heat grid.
- BODY: insights, weight trend, timeline.
- TRAIN: strength curves, PR cards.
- MORE: Report, Recommendation Ledger.

REVIEW-001 brings them into one place, **Review**, built around questions and offering three ways in:

- **Always-on.** Open at any time. Each question has a one-sentence answer, a small chart, and a detail
  view with its evidence.
- **Weekly review (Mondays).** About 3 minutes, covering habits and training for the Monday–Sunday week.
  It ends with your notes and a focus for next week that you choose yourself.
- **Monthly review (every 4th Monday).** Covers your body:
  - new progress photos side by side with the last set;
  - measurements;
  - the 4-week weight trend and strength change.

## Home: the core six

Ordered by Gavin's goals:
1. Is my weight going down, and at what rate?
2. Am I keeping my strength while losing weight?
3. Am I getting stronger?
4. Is each muscle getting enough work?
5. Am I hitting protein and calories?
6. Am I training consistently?

The remaining questions sit under "More questions".

## The full question catalog

Key:
- **Now:** existing records and calculations can answer it.
- **Derive:** needs a new read-only calculation over existing records.
- **1a data:** the measurements, photos or weekly focus added in Phase 1a.

| # | Question | Source |
|---|---|---|
| 1 | Is my weight going down (7-day trend, not daily noise)? | Derive |
| 2 | How fast, in lb/week and % of bodyweight? | Derive |
| 3 | When will I reach my goal weight at this pace? | Now (`projectGoalDate`) |
| 4 | How much do I normally swing day to day? | Derive |
| 5 | Am I eating what I planned (days on calorie target)? | Now / derive (logged days only) |
| 6 | Am I hitting protein? | Now |
| 7 | How much am I really burning? | Now (expenditure readout) |
| 8 | Do work days and days off differ (weight, eating, sleep)? | Derive (declared work context) |
| 9 | Is my waist getting smaller? | 1a data |
| 10 | Am I getting stronger overall? | Derive (1b) |
| 11 | Which lifts are progressing, and which have stalled? | Now (stall finding) + derive (1b) |
| 12 | Am I keeping or gaining strength while losing weight? | Derive (1b) |
| 13 | How strong am I relative to bodyweight? | Derive (1b) |
| 14 | What records did I set this week or month? | Now |
| 15 | Am I progressing as my plan intends? | Now (progression) |
| 16 | Am I losing fat, not muscle? | Derive + 1a data (waist, photos) |
| 17 | Hard sets per muscle group per week? | Derive (1b; muscle mapping for template exercises) |
| 18 | Is training balanced (push/pull, upper/lower, shoulders, arms)? | Derive (1b) |
| 19 | Is weekly volume growing? | Derive (1b) |
| 20 | Do I look different? | 1a data (photos) |
| 21 | Are chest, arms and shoulders growing? | 1a data (measurements) |
| 22 | Am I training consistently (sessions per week, longest gap)? | Derive |
| 23 | How does sleep relate to my workouts? | Now (finding) |
| 24 | How do night shifts affect training, eating and sleep? | Now + derive |
| 25 | How have I been feeling over time? | Derive (check-ins) |
| 26 | How complete is my logging, so I know which numbers to trust? | Derive |
| 27 | What changed this week compared with last week? | Now (Weekly) |
| 28 | Did I do what I chose to focus on? | 1a data (focus) |

## Rules every answer follows (doctrine and locked decisions)

- **Facts and patterns, never a grade.** No scores, streaks, guilt copy or red "bad" colors. Charts use
  neutral ink. Red stays reserved for earned significance (the existing PR tag) and the primary button.
- **Confidence matches evidence.**
  - Every answer names its window and how many records it came from.
  - Below a floor it says what is still needed and shows a "Building up" state, never a guessed chart.
  - Partial logging is never treated as total intake, and missing data stays missing.
- **Counts, not causes.** The existing findings rule applies: no "usually", "tends to" or "because".
- **Inspectable.**
  - Every number has "How this is calculated" and "Every record in this range".
  - Charts are inline SVG with a text summary, tap-to-inspect points and a table alternative.
  - Each chart has one y-axis. Weight and strength sit on stacked charts, never a dual axis.
- **No new authority.**
  - Review is read-only analysis. It does not recommend anything, does not feed the Engine,
    and adds no TODAY rows.
  - The weekly focus is the operator's choice, labeled "Your choice, not a recommendation."
  - Next week reports how the focus went as a count.
- **Review is a COMMAND surface.** TODAY gets only the quiet "Weekly review ready" line (rules below).
- **Weigh-in consistency.** For shift work, a weigh-in means *after your main sleep, before eating*.
  Review shows timing consistency, because mixed timing creates false swings.
- **Machine lifts.** Best set and total volume are the primary strength measures. Estimated max (Epley)
  is a secondary trend, because it is rough at the higher rep ranges these templates use.

## Weekly and monthly review timing

- **Weekly window:** the review covers the Monday–Sunday calendar week. Day facts use BEYOND's
  existing lived-day rules.
- **When it appears:** the review becomes ready on Monday and stays ready until it is done or until
  the next one replaces it. There is no "missed" state and no streak.
- **TODAY line:** a quiet, neutral line ("Weekly review ready"), outside the phase-row cap like the
  existing operator controls.
  - It is shown only when the operator is not in a pre-work or at-work phase. Gavin's rotation
    makes every other Monday a work day.
  - On those Mondays it appears at the next off time.
  - It disappears once the review is done.
- **Monthly review:** every 4th Monday, counted from the first completed weekly review. It replaces
  that week's review and includes the weekly steps.

## Phases

### Phase 1a — Review hub, reviews, baseline capture and focus (PROTECTED, approved to start after merge)

Review hub:
- A new MORE destination, REVIEW, plus a SYSTEM catalog entry.
- The core-six home and "More questions".
- Weekly stays a separate screen.

Ships with questions that work on today's data:
- weight trend, rate, swing, goal date and timing consistency;
- protein and calories;
- expenditure;
- recovery, sleep and check-ins;
- consistency and logging coverage;
- work days vs days off.

Strength and volume questions show "Building up" until Phase 1b.

Reviews:
- the weekly review on Mondays, with the TODAY line;
- the monthly review every 4th Monday.

**Measurements** (additive storage):
- Waist is the primary measurement. Chest, arms, shoulders and hips are optional.
- Entries are corrected like other BODY records, with no deletion.
- Earlier values can be backdated, so tape measurements taken before launch can be entered.

**Progress photos** (additive storage, kept on the device only):
- Front, side and back.
- An optional framing guide, which uses the last photo as a ghost outline.
- A side-by-side compare.
- Earlier photos from the phone gallery can be imported with their dates, so baseline photos taken
  before launch count.
- The backup handling must be decided before implementation: see Decision 2.

**Weekly note and focus** (additive events):
- The focus is chosen from a few neutral options built from the week's own facts, or written in.
- Next week reports what happened, as a count.

New pure read-only calculations go in `engine/`. They are unit-tested and never used by `evaluate`:
- 7-day average, rate, swing and weigh-in timing;
- consistency and coverage;
- review-window bucketing.

Leverage gate: **BUILD OWNED** inline SVG, reusing the timeline and strength-curve pattern. No new
runtime dependency. Photos use the browser's own file input and canvas, with no image library.

### Phase 1b — Strength and muscle analytics (PROTECTED; after about 3 weeks of real training)

- Best set, volume and estimated max per lift; a strength index; relative strength.
- Hard sets per muscle group, using a mapping for built-in template exercises and the existing
  custom-exercise `muscleGroup`.
- Balance views: push/pull and upper/lower.
- The "strength while losing weight" view.
- Designed against Gavin's first real sessions, with synthetic data used for tests only.

### Follow-up (C2) — operator-set targets

- Optional targets for weight-loss rate, sets per muscle and sessions per week.
- When setting them, cited general ranges are shown for context. Examples: about 0.5–1% of bodyweight
  per week; roughly 10–20 hard sets per muscle per week.
- Additive settings, the same pattern as the existing goal weight.

### Phase 2 — Reflection depth (JOURNAL-002)

- Journal and Capture improvements, feeding into Review beside the numbers.
- Needs its own brief.

## Remaining decisions for Gavin

1. **Phase 1b and Phase 2** each need a go-ahead when their time comes.
2. **Photos in backups.** Before Phase 1a builds photo storage, choose one:
   - **(a)** include photos in the normal backup file, which makes it much larger;
   - **(b)** keep a separate "photos backup" file;
   - **(c)** leave photos out of backups, so they stay only on the device and are lost if the phone is lost.

   The Builder will recommend one with sizes measured before you choose.

## Outside Review, flagged

For "visibly more muscular", the training program matters more than analytics. Templates A, B and C
are machine-based and fairly light on shoulders and back. A read-only look at whether the program fits
the goal is available on request. Custom Programs already exist if it needs adjusting.

## Acceptance evidence (Phase 1a)

- **Unit tests** for every calculation and abstain floor, including runs over the protected fixtures
  (read only).
- **Schema** migration tests: additive only, so older backups restore unchanged.
- **Backup round-trip tests,** following whatever photo-backup option Gavin chooses.
- **Browser tests** through `<App />` at 320, 360 and 412 px:
  - axe accessibility, reduced motion, keyboard use and tap-to-inspect;
  - the "Building up" states;
  - TODAY-line timing across a work Monday and an off Monday;
  - focus recording and next week's count;
  - photo import, compare and correction.
- **A production-build acceptance script** with screenshots.
- **No Engine/`evaluate` change** and no new dependency.
- Independent exact-head review, green required CI, and Gavin's merge approval.
