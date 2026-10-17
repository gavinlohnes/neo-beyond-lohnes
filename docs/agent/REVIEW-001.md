# REVIEW-001 — Data review that answers your questions (approved plan)

**Status:** plan approved by Gavin on 2026-10-14. Phase 1a implementation starts after this brief
merges. Phase 1b, the C2 targets follow-up and Phase 2 (JOURNAL-002) each need their own go-ahead.

- **Builder:** Claude Code for the remaining full Phase 1a; Codex owns the read-only hub slice described below.
- **Design-pass starting master:** `53fcf68`. Each implementation PR records its own exact starting commit.
- **Lane:** **PROTECTED** for Phase 1a. It turns the existing MORE → REVIEW destination into the hub, adds a quiet TODAY line, new
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
7. **The name "Review" stays (2026-10-15).** The existing MORE → REVIEW screen (the Recommendation
   Ledger) becomes a **Recommendations** section inside the new Review.
   - Its read-only contract is unchanged: it still does not aggregate or trend.
   - The SYSTEM catalog's existing REVIEW entry is re-described rather than duplicated, so the
     catalog stays at its current count.
   - The 2026-09-30 exception allowing trends "on Review" applies to this new Review.

Mockups from the design pass (illustrative data, 390 px): [`docs/screenshots/review-001/`](../screenshots/review-001/).
They show the layout and chart language. Their answer copy and measure choices are illustrative and
are superseded by the rules below. In particular, the "fat, not muscle" question gives no verdict, and
best set and volume lead the strength measures.

## Goal

Gavin's goals are to lose weight, get stronger, and look visibly more muscular. His stated motivation
is accountability and good data to review.

BEYOND already records most of the evidence, but its analytics are spread across several screens:
- Weekly: Ribbon, findings, *your usual*, Mirror, expenditure, heat grid.
- BODY: insights, weight trend, timeline.
- TRAIN: strength curves, PR cards.
- MORE: Report, and REVIEW (the Recommendation Ledger, which becomes Review's Recommendations section).

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
4. How is each muscle trained (hard sets per week)?
5. Am I hitting protein and calories?
6. Am I training consistently?

The remaining questions sit under "More questions". The Recommendations section (the existing ledger,
unchanged) sits below them.

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
| 16 | Am I losing fat, not muscle? Shows weight, waist and strength changes side by side next to the photos, states that BEYOND does not measure fat or muscle, and gives no verdict | Derive + 1a data (waist, photos) |
| 17 | Hard sets per muscle group per week? | Derive (1b; muscle mapping for template exercises) |
| 18 | Is training balanced (push/pull, upper/lower, shoulders, arms)? | Derive (1b) |
| 19 | Is weekly volume growing? | Derive (1b) |
| 20 | Do I look different? | 1a data (photos) |
| 21 | Are chest, arms and shoulders growing? | 1a data (measurements) |
| 22 | Am I training consistently (sessions per week, longest gap)? | Derive |
| 23 | How do workouts compare after shorter and longer sleep? | Now (finding) |
| 24 | How do training, eating and sleep differ on shift days? | Now + derive |
| 25 | How have I been feeling over time? | Derive (check-ins) |
| 26 | How complete is my logging, so I know which numbers to trust? | Derive |
| 27 | What changed this week compared with last week? | Now (Weekly) |
| 28 | Did I do what I chose to focus on? | 1a data (focus) |

## Rules every answer follows (doctrine and locked decisions)

- **Facts and patterns, never a grade.** No scores, streaks, guilt copy or red "bad" colors. Charts use
  neutral ink. Red stays reserved for earned significance (the existing PR tag) and the primary button.
  The "Weekly review ready" card has no red edge.
- **Confidence matches evidence.**
  - Every answer names its window and how many records it came from.
  - Below a floor it says what is still needed and shows a "Building up" state, never a guessed chart.
  - Partial logging is never treated as total intake, and missing data stays missing.
- **Counts, not causes.** The existing findings rule applies: no "usually", "tends to" or "because".
  Question titles avoid causal verbs such as "affect". "Enough" is never used without an operator-set
  target.
- **No body-composition verdicts.** BEYOND does not measure fat or muscle. It shows the changes it can
  see (weight, waist, strength, photos) side by side and leaves the conclusion to the operator.
- **Abstain copy is never a streak.** It says, for example, "Needs 7 logged days in the last 14", never
  "in a row".
- **Inspectable.**
  - Every number has "How this is calculated" and "Every record in this range".
  - Charts are inline SVG with a text summary, tap-to-inspect points and a table alternative.
  - Each chart has one y-axis. Weight and strength sit on stacked charts, never a dual axis.
- **No new authority.**
  - Review is read-only analysis. It does not recommend anything, does not feed the Engine,
    and adds no TODAY rows.
  - The weekly focus is the operator's choice, labeled "Your choice, not a recommendation."
  - Its suggested options only restate logging or consistency facts from the week (for example
    "Log weight 5+ mornings", "Train 3 times"). Program changes are write-in only, so BEYOND never
    issues training-plan advice through the focus.
  - Next week reports how the focus went as a count.
- **Review is a COMMAND surface.** TODAY gets only the quiet "Weekly review ready" line (rules below).
- **Weigh-in consistency.** For shift work, a weigh-in means *after your main sleep, before eating*.
  Review shows timing consistency, because mixed timing creates false swings.
- **Machine lifts.** Best set and total volume are the primary strength measures. Estimated max (Epley)
  is a secondary trend, because it is rough at the higher rep ranges these templates use.

## Weekly and monthly review timing

- **Weekly window:** the review covers the lived days that start Monday through Sunday. A lived day
  (16:30 → 16:30) belongs to the calendar date it starts on, so the Sunday 16:30 → Monday 16:30 day
  belongs to the week that just ended. Weekly check-in keeps its rolling "last 7 days", and each
  surface labels its own window ("Oct 7 – 13" vs "last 7 days").
- **When it appears:** the review becomes ready once the week's last lived day ends, at Monday 16:30.
  That way it never shows an unfinished day, matching how *your usual* excludes the day in progress.
  It stays ready until it is done or until the next one replaces it. There is no "missed" state and
  no streak.
- **TODAY line:** a quiet, neutral line ("Weekly review ready"), outside the phase-row cap. Its
  precedent is the existing backup-due line, a "ready" notice with LATER, not the operator controls.
  - It is shown only in the `OFF` phase: never in `PRE_WORK`, `SCHEDULED_SHIFT` or
    `EXPECTED_POST_WORK` (after a night shift, before sleep). Gavin's rotation makes every other
    Monday a work day; on those Mondays it appears at the next `OFF` time after Monday 16:30.
  - LATER hides it for the rest of that lived day.
  - It disappears once the review is done.
- **Monthly review:** every 4th Monday, counted from the first completed weekly review. It replaces
  that week's review and includes the weekly steps.

## Phases

### Phase 1a — Review hub, reviews, baseline capture and focus (PROTECTED, approved to start after merge)

Review hub:
- The existing MORE → REVIEW destination becomes the hub. The ledger moves into its Recommendations
  section, and the SYSTEM catalog REVIEW entry is re-described (no new entry).
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
- Every photo, taken or imported, is re-encoded through canvas. This strips EXIF location and device
  metadata, and the stripping is a tested requirement.
- Photo storage requests persistent storage (`navigator.storage.persist()`). Wherever eviction
  remains possible, the screen says so plainly; this matters most if backup option (c) is chosen.
- Photos go in the normal backup file (Decision 2, ruled 2026-10-17: option (a)).

**Weekly note and focus** (additive events):
- The focus is chosen from a few neutral options that restate the week's logging or consistency facts,
  or written in. Program changes are write-in only.
- Next week reports what happened, as a count.

New pure read-only calculations go in `engine/`. They are unit-tested and never used by `evaluate`:
- 7-day average, rate, swing and weigh-in timing;
- consistency and coverage;
- review-window bucketing.

Leverage gate: **BUILD OWNED** inline SVG, reusing the timeline and strength-curve pattern. No new
runtime dependency. Photos use the browser's own file input and canvas, with no image library.

### Phase 1b — Strength and muscle analytics (PROTECTED; after about 3 weeks of real training)

- Best set, volume and estimated max per lift; a strength index; relative strength.
- Hard sets per muscle group. Built-in template exercises map to the matching `EXERCISE_LIBRARY`
  entries (for example `machine-chest-press` → `lib-machine-chest-press`). Custom exercises use their
  existing `muscleGroup`. The library's "Arms" group needs a biceps/triceps split before the push/pull
  view can be built.
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

1. **Phase 1b, the C2 targets follow-up and Phase 2** each need a go-ahead when their time comes.
2. **Photos in backups — decided 2026-10-17: option (a).** Gavin chose to include photos in the
   normal backup file ("Photo backup: option a, include photos in the normal backup"). The
   alternatives were a separate photos backup (b) or no photo backup (c). Consequences for
   Phase 1a: a full backup is noticeably larger, so the Builder measures and reports real backup
   sizes as acceptance evidence; restore brings photos back with the rest of the data; older
   backups without photos restore unchanged.

## Outside Review, flagged

For "visibly more muscular", the training program matters more than analytics. Templates A, B and C
are machine-based and fairly light on shoulders and back. A read-only look at whether the program fits
the goal is available on request. Custom Programs already exist if it needs adjusting.

## Acceptance evidence (Phase 1a)

- **Unit tests** for every calculation and abstain floor, including runs over the protected fixtures
  (read only).
- **Schema** migration tests: additive only, so older backups restore unchanged.
- **Backup round-trip tests** with photos included in the normal backup (Decision 2, option (a)),
  plus measured backup sizes.
- **Browser tests** through `<App />` at 320, 360 and 412 px:
  - axe accessibility, reduced motion, keyboard use and tap-to-inspect;
  - the "Building up" states;
  - TODAY-line timing across a work Monday and an off Monday;
  - focus recording and next week's count;
  - photo import, compare and correction.
- **A production-build acceptance script** with screenshots.
- **No Engine/`evaluate` change** and no new dependency.
- Independent exact-head review, green required CI, and Gavin's merge approval.

## Phase 1a delivery — read-only hub slice (2026-10-17)

The approved Phase 1a plan is being delivered in reviewable slices. Gavin directed further major
progress after #232's B1 repair. Codex owns this read-only hub slice on
`codex/review-001-readonly-hub`, starting from freshly fetched master
`ca67da629628520ab1026d9d03114648e7bcb588`; active PR linked from the branch. Lane remains
PROTECTED (Review composition and new pure analysis), with independent exact-head review and
Gavin's merge approval. BUILD OWNED small composition over the canonical ledger and effective
weight queries; native disclosure/select/table/SVG, no new dependency.

This slice adds the core-six question home, weight comparison, recorded protein/calories,
training frequency, main sleep, logging presence and declared-work/off comparisons. Strength
questions explicitly abstain until Phase 1b. The existing recommendation ledger remains a
separate, unchanged read-only section. Source-day History links return to the same Review
selection, disclosure, focus and position. Completed 16:30 calendar windows only; restarted-day
segments are grouped, any unfinished segment excludes that lived day, mixed declarations stay
unknown, and multiple main sleeps are excluded. Missing values stay missing. Daily weight means
avoid giving multiple same-day weigh-ins extra weight; weekly comparison requires 7 weighed days
in 14 and at least 3 in each week. Work/off averages require 3 logged days per measure per context.
These are presentation evidence floors, never Engine inputs or health targets.

Remaining Phase 1a work is not claimed complete: weekly/monthly saved reviews and focus,
measurements, photos/metadata stripping/backup-size evidence, readiness line, goal-date/swing/
timing analysis, expenditure and check-in questions. No storage/schema/backup/event change or
TODAY composition change in this slice. This avoids overlap with active restore-compatibility
PR #236. #232 and #236 remain separate PRs and are not merged by this work. No Phase 1b/C2/Phase 2,
Engine evaluation, plans, accounts, fixture, CI/protection, merge or deployment changes.
Acceptance: pure calendar/floor/segment/abstention tests; canonical correction/void/no-write
integration coverage; App browser source/History return at 320/360/412, keyboard-accessible
point selector and tables, axe, read-error/retry; full verification and built-preview acceptance.

## Phase 1a delivery — weekly review loop (2026-10-17)

Gavin explicitly directed: “ship the connected foundation, then build the weekly review loop”,
then reaffirmed continuing. #232 merged at `fda45c2`; #237 was reconciled, independently reviewed at
`871c35b`, passed required CI and merged at `554b557`. Codex owns the weekly loop on
`codex/review-001-weekly-loop`, starting from freshly fetched master
`554b55722d895c5fb6ca979bd9f08990c58ec6c1`. Lane: PROTECTED; new exact-head independent review,
green required CI and Gavin's separate merge decision are required for this new PR.

Scope: closed Monday–Sunday lived-day windows (ready Monday16:30), recorded weekly facts,
optional note, optional operator-chosen focus, next closed week's counts, saved-review listing,
append-only revisions, session draft/reload protection, and a neutral TODAY notice only in OFF.
LATER lasts for the current lived day. Counts restate existing evidence, never grade outcomes;
written focus has no automatic verdict. Options repeat the reviewed week's counts; program
changes remain write-in. Focus applies to the week starting the reviewed period's end, even
when the review is completed late; counts explicitly cover that entire named week.

Implementation: one additive `WEEKLY_REVIEW_SAVED` event type in the existing events table,
including reviewed start/end, note, chosen focus and optional superseded event ID. Existing
atomic command helper guards active-day ownership, exact latest closed period, same-payload
idempotency and expected prior version. No schema/table/version change, no backup-format change;
normal native backups already include events and round-trip both original and revised reviews.
Malformed saved review reads fail visibly, not as an empty week. This realizes the approved
additive review-events design without commodity storage duplication. BUILD OWNED bounded
calendar/read model and canonical UI; reuse ledger, effective records, native controls, existing
transaction/event path, draft provider and normal backups; no dependency.

Calendar math uses local 16:30 boundaries through DST. Drafts are never retargeted or overwritten
on tab re-entry or week change; an old-week draft remains visible with an explicit current-week
switch. Reload/process eviction still clears unsaved drafts under existing protection. Saved
reviews collapse after a successful save and restore focus to their disclosure, keeping the
always-on question hub accessible. Native source History/return and the separate rolling Weekly
Check-in remain intact. No Engine evaluation/priority/plan change, schema/migration, photo or
measurement storage, fixture, provider, dependency, CI/protection change, or unrelated #236 work.
Monthly/body reviews, photos, measurements and the remaining Phase1a questions stay unimplemented.
Verification: calendar/DST/count tests; revisions/concurrency/failure/idempotency, malformed data,
active-day and ordinary backup-round-trip integration tests; App flows at320/360/412, axe,
OFF-phase timing/LATER, saved reload, draft detours/rollover and save retry; full gate and built
PWA acceptance with offline save/reload/next-week focus counts. Exact results/head tracked in PR.
