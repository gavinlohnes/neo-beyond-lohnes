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

**Activated 2026-10-24.** Gavin approved Codex proceeding after NAV-001: “do it.” Builder:
Codex. Branch: `codex/review-001-phase1b`. Starting master:
`aafa5b57c85050b5cab3eed3a07e484ae3fbcd02` (#293 merged). Active PR:
[#294](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/294).

**Bounded outcome:** Review answers whether recorded strength is improving or being preserved while
weight drops, which lifts are progressing or stalling, weekly hard sets by muscle, and broad
push/pull plus upper/lower balance. Every answer is read-only, names its evidence window and sample
floor, abstains when records are not comparable, and links back to the existing session/lift truth.

**Scope / exclusions:** pure calculations over existing effective workout, exercise-library,
bodyweight and lived-day records; application queries; Review presentation and focused tests. No
schema, event, command, backup, dependency, provider, workout-template, progression, Engine
recommendation, target, program-change or automatic-decision change. C2 targets and JOURNAL-002
remain separate approvals. No body-composition verdict: weight, waist, photos and strength remain
side-by-side evidence for Gavin to interpret.

**REUSE:** existing performed-set/session truth, undone-set filtering, exercise-name/library and
custom-exercise mappings, TRAIN lift curves, Review question/evidence patterns and inline SVG.
**OWN:** BEYOND-specific comparability, sample floors, time windows, muscle mapping and abstention.
**BUILD FROM SCRATCH:** the small pure aggregation layer only; existing primitives do not answer
cross-lift strength preservation or weekly muscle exposure.

**Finished when:** synthetic and protected-fixture-safe tests prove exclusions, undo/skip/
substitution handling, same-lift comparability and missing-data abstention; Review exposes the
approved answers at phone widths with accessible evidence; architecture/typecheck/build and
required CI pass; an independent reviewer passes the exact head; Gavin separately approves merge.

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

**Authorized 2026-10-25:** Gavin approved C2 after Phase 1b merged in #294. Codex is the Builder;
PROTECTED because operator-selected targets change how Review interprets recorded evidence. Starting
commit `9bc96e826f7167cadb0be8ca5f90abd91f72d284`; branch `codex/review-001-c2-targets`; PR pending.
Scope is optional weight-change-rate, per-muscle-set and strength-session targets, their local
settings, and read-only comparisons against existing Review evidence. Targets are the operator's
choices, never defaults, recommendations or Engine inputs. Excludes automatic program changes,
generic pass/fail judgment, new providers/dependencies, recommendation priority, and unrelated
Review/JOURNAL work. **REUSE:** the existing single mutable targets row, save/undo flow, canonical
Review projections and inspectable evidence. **OWN:** BEYOND's missing-data-aware comparison copy.
**BUILD FROM SCRATCH:** none; this extends existing settings and read models. Finished when targets
can be set/cleared and survive backup/restore, Review shows actual-versus-chosen values without
inventing completeness, phone-width and compatibility tests pass, required CI is green, an
independent reviewer passes the exact head, and Gavin separately approves merge.

### Phase 2 — Reflection depth (JOURNAL-002)

- Journal and Capture improvements, feeding into Review beside the numbers.
- Needs its own brief.

## Remaining decisions for Gavin

1. **C2 targets and Phase 2** each need a go-ahead when their time comes. Phase 1b was approved
   and activated on 2026-10-24.
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

## Phase 1a delivery — storage slice (2026-10-17)

Builder: Claude Code, on `ccr-f27681c1-sb8gif`, after RESTORE-COMPAT (#236). Codex's read-only hub
slice (#237) left measurements, photos, metadata stripping and backup-size evidence unclaimed;
this slice takes exactly those, as storage and application commands/queries only. Screens for
entering measurements and taking, importing and comparing photos come in a later slice. Lane:
PROTECTED (schema and backup contract).

- **Measurements** are events (`MEASUREMENT_LOGGED`, `_CORRECTED`, `_VOIDED`) with no BeyondDay:
  site (waist primary; chest, arms, shoulders, hips), inches (5–100), and the date measured.
  Earlier dates are allowed and later ones refused. Corrections chain like other BODY logs, and
  nothing is erased.
- **Progress photos** are a new `progressPhotos` table (schema v13, additive). Every image is
  re-encoded through the browser's own decoder and canvas before it is stored: JPEG, at most
  1600 px on the long edge. The original file, and its EXIF location and device data, is never
  stored. Pose and date are corrected in place, each with an event. Events carry no image data.
- **Hide or delete permanently** (Gavin, 2026-10-17): hide keeps the image, including in backups.
  Delete permanently removes it from this device and from later backups. A backup exported
  earlier still contains it, and the screen that offers delete must say so.
- **Backups:** photos travel in the normal backup file as Blobs, which dexie-export-import already
  handles, so the file format is unchanged. Measured with three 4032×3024 sources: each stored at
  1600×1200 and about 200 KB, and the backup grew about 0.8 MB (1.34× the image bytes, from base64).
  Those are synthetic images; detailed real photos may run larger. A v12 or older backup restores
  with no photos.
- Storage persistence is requested (`navigator.storage.persist()`) when a photo is added.
  Whether it was granted is readable, so the later photo screen can say plainly when eviction
  remains possible.

## Phase 1a delivery — Weekly Review dashboard (2026-10-18)

Gavin approved this objective after a side-by-side comparison with the owner-frozen Ultimate
prototype ("approve, Claude Code builds it", 2026-10-18). Builder: Claude Code, on
`ccr-f27681c1-sb8gif`, from master `8e5dbab`. Codex stays off `src/ui/screens/review/**` and
`src/engine/weeklyDashboard.ts` until it merges. Lane: PROTECTED, like the other Review slices.

It turns MORE → REVIEW's weekly section into the prototype's Weekly Review, in the prototype's
order:
- **Week header:** the closed Monday–Sunday week, with ← PREVIOUS / NEXT → to step through closed
  weeks (PREVIOUS stops at the first recorded day).
- **Headline numbers:** sleep average with its work/off split; recorded protein average; strength
  sessions; weight change from the week's first to last recorded weigh-in (needs two weighed
  days).
- **Review status:** COMPLETE REVIEW opens Carry forward.
- **The seven lived days:** neutral mini bars for sleep, protein and training, plus a work/off tag.
  Selecting a day shows its detail (sleep, protein, water, weight, session), and INSPECT DAY
  EVENTS opens that day in History.
- **Patterns:** an ALL / WORK / OFF switch over the week, and sleep by context. Work/off averages
  keep the hub's floor of 3 logged days per measure. The prototype's "energy / 5" is left out
  because energy is not stored per day.
- **Metric explorer:** sleep, protein, water or weight across the week. Missing days are left out,
  never drawn as zero.
- **Findings:** the existing read-only findings, as they stood at the end of the week (45 days).
- **Accomplishments:** counts only — sessions, personal records set that week, and the weight
  observation.
- **Carry forward:** #238's save-review form, unchanged in behaviour, for the latest week only.
  Earlier weeks show their saved review read only.

The 28-day question hub and Recommendations stay below it. Read only apart from #238's
existing form: no schema, event, backup, Engine-evaluation or dependency change.
`engine/reviewOverview.ts` shares its per-day row builder (`projectReviewRows`) and adds recorded
water to each row; its outputs are otherwise unchanged. Neutral ink throughout: red stays for the
primary button and the PR tag.


## Phase 1a delivery — monthly review (2026-10-18)

Builder: Claude Code, during Gavin's overnight sprint permission (2026-10-18: "improve or add
features to BEYOND"). This builds the approved Phase 1a monthly review; no new authorization was
needed for the scope itself. Branch `claude/review-001-monthly`, stacked on #244
(BODY-PROGRESS-001, head `14f3c1c`) because it reads that PR's measurement and photo UI. Lane:
PROTECTED, like the other Review slices. Merge after #244.

- **Cadence:** the week of the first saved weekly review is week 0; weeks 4, 8, 12… are monthly.
  Before any review is saved there is no monthly review. Pure and unit-tested in
  `engine/monthlyReview.ts`, never used by `evaluate`. **Ruled 2026-10-18:** Gavin delegated the
  reading ("do what makes sense"). "Every 4th Monday, counted from the first completed weekly review"
  is four weeks after it, not the third, so each monthly review covers exactly its own 28 days.
- **It replaces that week's review:** the dashboard header reads MONTHLY REVIEW and the TODAY line
  "Monthly review ready". Every weekly step stays, and saving still uses the existing
  `WEEKLY_REVIEW_SAVED` event. Ordinary weeks say "Monthly review in N weeks".
- **Body composition, last 4 weeks** (the 28 lived days ending with the reviewed week): weight
  from the first to the last weighed day (two needed), each tape-measured site's first and last
  reading (one reading gives no change), and same-pose photo pairs. A pair is the earliest and
  latest visible photo in the window, or the latest one before it when the window holds one.
  Hidden photos are never shown. Differences only, no verdict, no score; missing stays missing.
- No Engine evaluation, schema, event type, backup, dependency or TODAY-row change. Read only.

Verification: engine unit tests (cadence across DST, window, measurement and photo pairing),
integration tests against the real commands (cadence, body figures, no writes), and browser
acceptance at 320/360/412 (TODAY line → monthly review, photo pair rendered, axe, no writes).

## Phase 1a delivery — optional photo framing guide (2026-10-18)

Builder: Claude Code, during Gavin's overnight sprint permission (2026-10-18). This builds the
approved Phase 1a item "an optional framing guide, which uses the last photo as a ghost outline".
Branch `claude/review-001-framing-guide`, stacked on #244 (head `14f3c1c`). Lane: PROTECTED.

- **Why an in-app camera:** #244's TAKE PHOTO opens the phone's native camera through a file input,
  and nothing can be drawn over it. USE FRAMING GUIDE opens a live preview through the browser's own
  camera API (`getUserMedia`, front camera; no dependency), with the latest visible photo of the
  chosen pose overlaid at 35% opacity. FRONT / SIDE / BACK switch the ghost; HIDE GUIDE removes it.
- **Same canonical save path:** CAPTURE draws the frame to a canvas and hands it to the existing
  `pick()` flow as a CAMERA photo, with the pose preset. The existing preview, date, SAVE PHOTO,
  re-encoding and metadata stripping then apply unchanged. Nothing is saved inside the guide, and
  the camera stops when it closes. When the camera is unavailable or denied, it says so and points
  to TAKE PHOTO / IMPORT PHOTO.
- Hidden photos are never a ghost. No schema, event, backup, Engine or dependency change.

Verification: browser tests at 320/360/412 with a canvas-backed fake camera (ghost shown,
44 px targets, axe, capture → existing preview with the pose preset → explicit save as CAMERA,
tracks stopped, nothing saved before SAVE PHOTO) and the denied-camera path. Screenshots in
`docs/screenshots/review-001-framing/`. A real phone camera is not exercised by automation.

## Phase 1a delivery — Body questions in the Review hub (2026-10-18)

Builder: Claude Code, during Gavin's overnight sprint permission (2026-10-18). Builds catalog
questions #9, #16, #20 and #21, which the plan sources from Phase 1a data (measurements and photos)
and which #244 now records. Branch `claude/review-001-body-questions`, stacked on #244 (head
`14f3c1c`) and carrying the same ported focus fix as #245/#246. Lane: PROTECTED.

Under "More questions" (the core six are unchanged):
- **Is my waist getting smaller? (#9)** The latest reading, its change since the previous and
  since the first. Below 2 readings it says "Building up". It names the number of readings and
  shows every waist measurement with corrections noted, plus "How this is calculated".
- **Are chest, arms and shoulders growing? (#21)** The same per site. Missing sites stay
  missing.
- **Do I look different? (#20)** Per-pose photo counts and date span. It points to BODY → Your
  progress → Photos to compare; only Gavin can judge. Hidden photos are left out.
- **Am I losing fat, not muscle? (#16)** "No verdict." Weight, waist, strength (still Building up
  until Phase 1b) and photos side by side under the rule "BEYOND does not measure fat or muscle."

Pure summaries in `engine/bodyReview.ts` (unit-tested, never used by `evaluate`); a read-only
application query over the existing BODY queries. No schema, event, backup, Engine-evaluation,
dependency or TODAY change.

Verification: engine unit tests; browser tests at 320/360/412 (values including a corrected
waist reading, hidden photo excluded, axe, no writes) and the nothing-recorded state.

## Phase 1a delivery — weight rate, usual swing, goal date and timing (2026-10-18)

Builder: Claude Code, during Gavin's overnight sprint permission (2026-10-18). Builds the approved
Phase 1a "Derive" calculations for core question 1, "Is my weight going down, and at what rate?":
"7-day average, rate, swing and weigh-in timing", plus the existing goal date (#3). Branch
`claude/review-001-weight-answers`, from master `85db25b` (not stacked). Lane: PROTECTED.

Inside that answer, below the existing comparison (the summary line is unchanged):
- **Rate:** the difference between the two 7-day means, per week and as % of bodyweight. Same floor.
- **Usual swing (#4):** the median absolute change between consecutive weighed lived days (needs
  5 pairs), so a day's change can be read against normal noise.
- **Goal (#3):** the existing BODY `projectGoalDate`, unchanged, when a goal weight is set.
- **Timing:** for shift work a weigh-in means after the main sleep, before eating. It counts
  weigh-ins logged after that lived day's main-sleep log; it cannot verify eating.

Pure calculations in `engine/weightAnswers.ts` (unit-tested, never used by `evaluate`); a
read-only application query. No schema, event, backup, Engine-evaluation, dependency or TODAY
change. Its styles live in their own file so it merges cleanly beside #247.

Verification: engine unit tests; browser tests at 320/360/412 (rate, swing, goal date, timing
before/after sleep, no goal, axe, no writes).
