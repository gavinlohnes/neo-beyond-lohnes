# BEYOND Capability Map

## PROJECT GRAYSON / LIFE OS DESTINATION

- [`PROJECT_GRAYSON_VISION.md`](../PROJECT_GRAYSON_VISION.md) is the owner-approved destination and
  contains the cross-domain evolution matrix. It does not authorize implementation.
- [`GRAYSON_RESEARCH_SYNTHESIS.md`](../GRAYSON_RESEARCH_SYNTHESIS.md) maps verified BEYOND capability
  to commercial and open-source donor patterns under the GRAYSON Evolution Rule. Its primary ruling
  is **connect before expanding**: most donor value is pattern-level adaptation, not subsystem import.
  It recommends production Lived-Day Orientation as the first bounded evolution objective; the
  report itself authorizes no implementation.
- **Shipped composition seam (C1.1):** `application/orientation.ts` composes the work-day wake (shift, own-range
  sleep, check-in, Engine/draft guidance, runway of known times, ≤ 2 actions) read-only; it replaced the 4.0-d
  briefing preview. C1.2 added day-purpose grammar (recovery/off/flip), the hard-day rule and `moodTrend`; extend
  it rather than adding another briefing.
- **Preserve before invention:** the destination reuses BEYOND's Operator Model and memory, lived-day
  records, work context, routines, Home/People facts, obligations, journal, personal experiments,
  Whole Picture/personal ranges, training, nutrition, TODAY/FIELD, COMMAND depth, deterministic
  Engine, and Alfred tool/action seams. Verify each in code before a brief claims reuse.
- **Identity seam:** current runtime is BEYOND + Alfred; destination is GRAYSON + Delta. Treat identity
  migration as behavior-, authority-, privacy-, and experience-dependent Protected work, never a
  search-and-replace objective.
- **Provider handoff:** [`PROJECT_GRAYSON_HANDOFF.md`](PROJECT_GRAYSON_HANDOFF.md) gives Claude, Claude
  Duet Steward, Codex, and future agents one repository-native starting point.
- **Current research disposition:** the baseline and donor synthesis are complete. Continue external
  research only for a concrete need inside a bounded objective; do not restart broad product hunting
  or assume the Daily Life Loop requires new storage, a new subsystem, or a rewrite.

Repo-native index of prior reuse findings, including archived Google Drive research. It is a
pointer/summary, not product authority. GitHub's current owner rulings, doctrine, UX decisions
and approved objective govern implementation under AGENTS.md / DEV-FLOW-002. Drive is a planning
archive, not competing authority; surface unresolved conflicts rather than silently picking a side.
Historical capability summaries may lag production code; verify current implementation before reuse.

Purpose: a Builder session should be able to answer "has this problem already been researched,
and what did the owner already approve?" in under a minute, without searching Drive by hand.
Per the Reuse Gate this mirrors: routine work should clear in minutes — this file existing is
what makes that possible for BEYOND specifically, instead of requiring a fresh Drive search
every time.

Use the existing AGENTS.md leverage gate. Update this index only when a useful durable finding
changes what future Builders should know; the approved brief/PR can otherwise hold the disposition.
No mandatory Drop harvest, fresh Drive search or parallel research process is required.

---

## SEARCH

- **Existing primitive**: `src/application/searchQueries.ts` + `src/ui/screens/search/SearchScreen.tsx`
  — hand-rolled matching, read-only, no ranking, no tap-to-navigate (deliberate scope at the
  time it shipped, per its own doc comment).
- **Approved donor direction**: **MiniSearch** (MIT, zero runtime deps, browser/offline-oriented,
  exact/prefix/fuzzy/ranking, incremental add/remove). Adjudicated "ADOPT CANDIDATE FOR FIRST
  LOCAL LEXICAL SEARCH" in the Research & Reuse Register (Post-FIELD Intelligence Reuse Audit,
  2026-08-22).
- **Constraint carried forward**: the index is disposable/rebuildable, never canonical truth —
  Dexie/events remain the source of truth; MiniSearch only ever re-derives from it.
- **Rejected**: vector/embeddings-first retrieval — "begin with structured queries + MiniSearch
  lexical retrieval... semantic retrieval only after corpus size/query failures demonstrate a
  real need."
- **Ruling on file**: dependency addition — High-Risk trigger, owner sign-off obtained
  2026-09-02 (see git history for the authorizing conversation).

## CAPTURE

- **Raw-first fast capture (UNIVERSAL-FAST-CAPTURE-001):** `ui/components/FastCapture.tsx` lives in the existing shell-owned RecordSheets Note target. TODAY’s one-tap CAPTURE goes straight to raw text; no type/folder/date and no inference. A saved raw thought may remain OPEN or explicitly preview a task/plan item using existing atomic `convertCaptureToObligation`; planned day and due date stay optional and independent. Current-session drafts survive sheet close; saved raw items and source history remain canonical/native-backed. OPEN CAPTURE reuses the existing later-processing route. No new inbox/notes store, AI sorting, provider or writer tools. [Brief](UNIVERSAL-FAST-CAPTURE-001.md).

- **Speed/reachability (SPEED-UNDER-FATIGUE-001):** TODAY’s quiet NOTE shortcut opens the existing shell-owned `RecordSheets` Note form via `onOpenRecord("note")`; permanent LOG remains central and unchanged. No parallel composer, interpretation or save path. Workout handoff focuses/positions the current exercise; normal/Gym LOG precedes optional metadata, with canonical defaults and handlers unchanged. [Brief](SPEED-UNDER-FATIGUE-001.md). These are speed improvements, not the deferred full capture system.

- **Existing primitive**: `captureItem`/`convertCaptureToObligation`
  (`src/application/commands.ts`, `src/application/intentCommands.ts`) — raw immutable text,
  fully manual triage, no derived fields.
- **Approved donor direction**: **chrono-node** (deterministic date/time extraction) +
  **Compromise** (lightweight linguistic evidence: tokenization, negation, POS) feeding a
  BEYOND-owned confidence/abstention gate. Parsed interpretations are always proposals requiring
  operator confirmation — never silently committed.
- **Why not simpler/heavier alternatives** — this is load-bearing, not a preference: a 30-round,
  2,700-case synthetic adversarial falsification campaign (DONOR-001 // Capture Intelligence
  Falsification Campaign, 2026-08-27) tested both extremes and falsified them —
  - A rules-only stack became brittle under adversarial composition (post-hoc fixes that reached
    100% on the failing blind family regressed the combined regression set to ~88%, i.e.
    rule-sprawl/overfitting).
  - A small local TF-IDF n-gram classifier trained on prior rounds generalized poorly to unseen
    phrasing, or bought precision by abstaining so aggressively that recall fell to ~47%.
  - A heavier local transformer model (Transformers.js/ONNX) is explicitly on **HOLD** — viable
    and offline-capable, but not yet justified.
  - Cloud LLM invocation on every Capture is explicitly **REJECTED**.
- **Gate status**: "CAPTURE V4" (the intelligence-layer capability) was explicitly ruled **NOT
  YET** authorized pending this chrono-node + Compromise/winkNLP stack actually being built and
  surviving held-out evaluation. Building it is what clears that gate — do not treat the
  interaction layer alone as sufficient.
- **Built (2026-09-02)**: `src/engine/captureIntelligence.ts`'s `suggestCaptureDueDate` — the
  BEYOND-owned confidence/abstention gate this entry called for. chrono-node supplies a candidate
  date; Compromise supplies a negation signal; the gate abstains (returns no suggestion) on no
  match, multiple conflicting date candidates, or negation, and otherwise labels the result
  STRONG or WEAK by chrono-node's own day/weekday certainty. Wired into the existing
  Capture-to-Obligation conversion form (`TodayScreen.tsx`/`CaptureSection.tsx`) as a pre-filled,
  freely editable/clearable `dueAt` field — never auto-applied, matching this entry's own "always
  proposals" constraint. Scope is deliberately narrow: date/due-date extraction only, not the
  broader triage/classification surface DONOR-001 explored. Real cost incurred: production bundle
  grew from 178.78 kB to 330.74 kB gzip (chrono-node + Compromise are both runtime, not dev,
  dependencies) — worth knowing before extending this further.
- **Ruling on file**: dependency addition — High-Risk trigger, owner sign-off obtained
  2026-09-02.

## OBLIGATIONS / RECURRENCE

- **Existing primitive**: `src/domain/intent/types.ts` (`Obligation`), `obligationRelevance.ts`
  (tier classification only — no recurrence concept exists yet).
- **Approved donor direction**: RFC 5545 (iCalendar) recurrence semantics as the standard, via
  **rrule.js** (BSD-3-Clause) — "do not write bespoke recurrence arithmetic." Caveat carried
  forward: rrule.js documents some deviations from strict RFC behavior, so wrap it behind
  BEYOND's own tests/contracts rather than trusting its output unquestioned.
- **Only relevant once recurrence is actually wanted as a feature** — this entry exists so that
  whenever it is, nobody hand-rolls weekday arithmetic first.

## INTELLIGENCE SPINE / DELTA

- **Week planning (WEEK-PLANNER-002, owner selected):** `application/weekPlannerQueries.ts` composes existing Week Ahead work provenance, training-programme assignments or labelled existing workout suggestions, canonical eligible tasks and local cached calendar events. `ui/screens/more/WeekPlanner.tsx` lives inside Plan Today with a Week Ahead link. `moveWeekTask` wraps existing `modifyObligation` atomically with stale-plan and current-date guards; only planned attention moves, never deadlines/recurrence/status. No parallel plan store, auto allocation or invented free-time score. Native controls support touch/keyboard; draft intended dates survive midnight and open-sheet retry retains its choice. [Brief](WEEK-PLANNER-002.md). Reuse this rather than building a second week calendar.

- **Training intelligence design (not implemented):** BEYOND already owns exercise references and
  custom exercises/templates, A/B/C and assigned programmes, live STANDARD/REDUCED/RECOVERY set
  recording, effort/warm-up/substitution, advisory progression/re-entry/deload, history, records and
  metric views. [`GRAYSON_TRAIN_INTELLIGENCE.md`](../GRAYSON_TRAIN_INTELLIGENCE.md) connects these
  into a proposed guided calibration, curated exercise understanding, four-to-six-week emphasis
  blocks and evidence-bounded Progress/Direction surface. Preserve current Engine/programme
  authority: the Mission A/B/C, short/minimum/home variants and programme-level adaptation are
  designs only. Muscle coverage is a proxy, never proof of growth; estimated strength is not an
  observed test. Prior free-exercise-db research remains a field-shape donor, not a bulk-import or
  content license. The read-only calibration preview (#608), ephemeral A/B/C draft (#609) and atomic
  owner-confirmed three-template save (#610) and explicit ordered sequence activation (#612) are
  now built; linked short/home variants and programme-level adaptation remain
  unimplemented.

- **Sequence activation design (design only, 2026-11-21):**
  [`GRAYSON_TRAIN_SEQUENCE_ACTIVATION.md`](../GRAYSON_TRAIN_SEQUENCE_ACTIVATION.md) reconciles the
  merged guided draft/template-save work with current custom templates, `TRAIN_PROGRAM_SET`, workout
  outcomes, capacity/recovery and planning. Current weekday/WORK-OFF assignments and the built-in
  Engine A/B/C selector are different systems; neither represents Gavin's approved date-independent
  custom-template sequence. `GRAYSON-TRAIN-SEQUENCE-ACTIVATE-001` (#612) deepens the existing
  causal programme revision with an explicit SEQUENCE mode and derives next-member state from qualifying outcomes,
  rather than add a mutable cursor/table or infer by names/dates. Existing capacity/recovery,
  working-set, RED-override and progression semantics are unchanged;
  linked short/home variants and planning connection remain separately Protected.

- **Finished-workout metric candidate (PR #584):** reuses the shared metric page and existing
  completed-or-partial “finished workout” definition to show lived-day counts, weekly totals,
  work/day-off coverage and today's recorded session labels. This is descriptive DATA evidence only:
  it is not sequence advancement, adherence, TRAIN Progress and Direction, a goal or advice. The
  stricter qualifying-outcome rule remains owned by the active programme projection.

- **Sequence planning connection (C4.4t candidate):** Week Planner and Week Ahead reuse the active
  sequence projection to label their existing eligible training opportunities with the same current
  next member and evidence. Dates remain presentation only: they never assign, advance, defer or
  create debt. The underlying PlannerDay/work-run suggestion projection is preserved, so this is a
  bounded overlay in the two approved planning views rather than new scheduling authority.

- **Training reality-form design (C4.4v, design only):**
  [`GRAYSON_TRAIN_REALITY_FORMS.md`](../GRAYSON_TRAIN_REALITY_FORMS.md) preserves FULL as the base
  template, reframes existing REDUCED as MINIMUM and preserves RECOVERY, while requiring separate
  owner-confirmed SHORT/HOME template links and form-at-start provenance. Names, shared exercises and
  muscle similarity are never programme identity. The recommended first later slice is linked HOME
  forms; no form link, event/command/backup change or implementation is authorized by the design.

- **Task date views (SMART-LISTS-001 / A7a):** `application/planTodayQueries.ts` exposes
  `getTaskSmartLists` over canonical current-obligation eligibility; PlanTodayScreen owns Today /
  Next 7 / No date. These are calendar-date filters, preserving the existing Plan Today convention,
  not lived-day ownership or a recommendation rank. Due and planned dates remain separate; past
  plans alone are not reinterpreted as deadlines. Reuse before adding another task-date projection.

- **Confirmed memory (MEMORY-001, #303; consult live PR status):** `application/memory.ts`
  projects operator-authored prep-food/bottle/other/recovery facts from append-only
  MEMORY_RECORDED events, with explicit confirmation, irrelevant/restore lifecycle, causal/stale
  guards and complete history. `components/MemoryPanel.tsx` is the shared MORE/PREP/recovery
  editor and contextual reader. No schema/new store/dependency; native backup retains the events.
  Facts are global across lived days; write provenance is guarded to the actual active day.
  No inference, general profile store, automatic plan change or Engine/advisory producer. Reuse
  this lifecycle for later approved domains rather than inventing another preference database.

- **Personal understanding (PERSONAL-UNDERSTANDING-001, #302):** optional workspace inside
  MORE → Review; `application/personalUnderstandingQueries.ts` composes canonical active Missions,
  explicitly selected optional targets, the latest completed week's saved focus, personal baselines
  with their exact qualifying source days, rotation-position comparisons, and reviewed written
  lessons. Existing `journalRelevance` supplies explicitly labelled word-matched candidate lessons
  beside Missions. `ui/screens/review/PersonalUnderstanding.tsx` exposes source records and existing
  edit destinations; it stores nothing and is never an Engine input. This is an inspectable view of
  existing knowledge, **not** a new preference store, general learning system or personality model.
  Do not duplicate it when planning personal memory, feedback or experiments; those remain future
  approved slices. Consult #302's live status before treating the branch implementation as shipped.

- **Existing implementation:** `src/domain/intelligence/types.ts` defines `AdvisoryNote` with
  source, evidence basis and attention level; `src/engine/advisory.ts` composes seven sources;
  `src/application/advisoryQueries.ts` gathers their current evidence. Sources: commitment
  relevance, training progression, reviewed journal lessons, shift protection, continuity,
  repeated outcome ratings and sleep-rollover attribution ambiguity.
- **Consumers:** `src/ui/screens/today/AdvisorySection.tsx` and `advisoryCopy.ts` present grouped
  observations and explanations. `src/application/continuityQueries.ts`, `src/engine/continuity.ts`
  and `patternProposal.ts` provide existing dismissal/continuity and narrow repeated-rating
  behavior. Tests include `tests/engine/advisory.test.ts` and
  `tests/integration/advisoryNotesQuery.test.ts`.
- **Recommendation explanations:** `src/engine/evaluate.ts` emits a `DecisionTrace`; explain
  that actual trace rather than recomputing recommendation reasoning in a parallel system.
  Advisory notes remain informational and do not feed back into recommendation arbitration.
- **Known limits:** journal relevance uses keyword matching; outcome patterns are a bounded
  repeated-rating rule, not general habit analysis; evidence basis fields do not universally
  contain navigable source-record IDs. Sleep attribution detection is not sleep-aware
  recommendation selection. Inspect current code before extending these seams.
- **Reuse direction:** extend these existing paths before introducing another intelligence
  layer. DELTA direction is in [DELTA-002.md](DELTA-002.md); each implementation slice retains its own approval.

## RECOMMENDATION ARBITRATION / OUTCOME MEMORY

- **Existing primitive**: `src/engine/evaluate.ts` (5 recommendation kinds, capacity + 2
  booleans only), `getPriorOutcomeMemory`/`rateOutcome` (outcome ratings captured, displayed
  once as history, explicitly never an Engine input).
- **This is BEYOND-owned, not a donor problem.** Per the Reuse Doctrine's own rule engine
  finding: "Do not outsource the BEYOND brain" — `json-rules-engine`, XState, and Open Policy
  Agent/Rego were each explicitly evaluated and **REJECTED/DEFERRED** for exactly this seam,
  because arbitration semantics are BEYOND's core doctrine and a generic framework would add
  indirection before complexity earns it.
- **Built (2026-09-02)**: the **Decision Journal** (Context → Options → Decision → Reasoning →
  Expectation, recorded now; Outcome → Lesson, recorded later), approved under the Whole-Life
  Capability North Star (`DEC-007`) — BEYOND's own answer to "where does learning go," not a
  library integration. General-purpose, not limited to Engine recommendations (owner ruling,
  2026-09-02). `src/domain/journal/types.ts`, `src/application/journalCommands.ts`/
  `journalQueries.ts`, `src/ui/screens/more/JournalScreen.tsx` (reachable from MORE), db.ts v8.
  Later work added reviewed journal lessons to advisory composition (see Intelligence Spine
  above); this does not make journal entries Engine arbitration inputs.
- **Ruling on file**: Obligations entering recommendation arbitration, and outcome history
  biasing recommendation selection, are both recommendation-priority changes — owner sign-off
  obtained 2026-09-02.

## BODY DASHBOARD (BODY-DASH-001)

- `ui/screens/body/BodyDashboard.tsx` is DATA's numbers-first overview. Its cards read existing queries through
  `application/bodyDashboardQueries.ts` (Garmin snapshot, water pace, habits, quit, schedule) and its pure helpers in
  `application/bodyDashboard.ts`.
- Add a card here rather than to `BodyScreen.tsx`. Reuse `MeasuredSheet` for any Garmin metric's history.

## VISUAL FOUNDATION (VISUAL-FOUNDATION-001)

- `ui/foundation/primitives.tsx` + `foundation.css`: BEYOND's shared visual primitives (`CommandBar`, `Panel`,
  `SourceTag`, `Sparkline`, `Meter`) and tokens (`.bf`). Use them for any new numbers-first panel instead of copying
  BODY's styles. The rules are in [VISUAL-FOUNDATION-001.md](VISUAL-FOUNDATION-001.md).
- No design-system dependency: the language is a few owned classes on the HUD palette.
- `application/dayContext.ts`'s `describeDayContext` is the command bar's day line (BODY, TRAIN); reuse it for any screen.

## NUTRITION

- **Guided Operating Loop finding (design only, 2026-11-20):** BEYOND's nutrition capability is
  broad but fragmented across LOG, DATA, MY MEALS, targets, meal planning and review. Preserve the
  canonical records and providers. Evolve them as one Food Week journey—plan, shop, prepare, log,
  review—with unified search, serving-first amounts, visible store/price uncertainty and Mission
  context. Do not import a pantry ERP, proprietary database or commercial recommendation algorithm.
  See [`GRAYSON_GUIDED_OPERATING_LOOP.md`](../GRAYSON_GUIDED_OPERATING_LOOP.md).

- **Existing primitive**: `SavedMeal` (`src/domain/common/types.ts`) — fully manual, no food
  data behind it.
- **Approved donor direction**: **USDA FoodData Central** as the preferred food-lookup data
  source (Open Food Facts conditional, pending its own data/distribution boundary check).
  Own the UX/logs/intelligence; do not build a proprietary food database.
- **Rejected**: importing another tracker's food database/architecture wholesale; a
  calorie-dashboard-first assumption.
- **Built (2026-09-02)**: `src/application/foodLookupQueries.ts`'s `searchFoods` — a thin,
  uncached passthrough to USDA's public FDC Search API (no local copy of USDA's food database is
  ever stored, matching this entry's own ruling). Wired into BODY's existing "ADD MEAL" form: a
  search box above the manual macro fields, selecting a result only pre-fills that form (name +
  four macros) — nothing is saved until the operator reviews it and clicks SAVE MEAL themselves,
  same "always a proposal" treatment as Capture Intelligence's due-date suggestions. A failed or
  empty search degrades to the plain manual-entry form, never an error state. No schema change:
  this is a live lookup into the pre-existing SavedMeal creation flow, not a new stored shape.
  API key handling: `VITE_USDA_FDC_API_KEY` is an optional build-time Vite env var, wired in
  `.github/workflows/deploy-pages.yml` from an optional `USDA_FDC_API_KEY` repo secret; absent
  that secret, production falls back to USDA's public rate-limited `DEMO_KEY` rather than
  breaking — this repo is a static client-side PWA with no backend to hide a real secret behind,
  and FDC keys are free/low-stakes/regenerable, so this is judged an acceptable trade-off rather
  than one requiring its own product decision.
- **Ruling on file**: schema addition — owner sign-off obtained 2026-09-02.
- **Built (FOOD-001, 2026-10-30, owner go)**: MyFitnessPal's logging flow in the MEAL sheet
  (`ui/components/RecordSheets.tsx`): a protein-first diary header (`application/foodDiaryQueries.ts`),
  SEARCH ALL FOODS (the USDA passthrough above, on tap only), amount by grams or servings, and
  SCAN BARCODE (`ui/components/BarcodeScanner.tsx`, the browser's BarcodeDetector, no library) with
  `application/barcodeLookup.ts`, a live uncached Open Food Facts product lookup (ODbL, credited).
  Open Food Facts is no longer conditional. Found foods are kept only as the owner's saved meals.

## WORKOUT CREATION / EXERCISE LIBRARY

- **Existing primitive**: none before TRAIN-CREATE-001 — `WORKOUT_TEMPLATES` is a fixed,
  hand-authored A/B/C set (`src/domain/workout/types.ts`), no personal exercise concept existed.
- **Approved donor direction**: **free-exercise-db** (Unlicense/public domain, ~800 exercises,
  name/primary+secondary muscles/equipment/instructions) as the preferred shape reference; wger
  (AGPL code, but its bundled exercise/ingredient data is separately CC-licensed) as prior-art for
  program-builder UX (custom routines, progression rules) — not a dependency or code source.
  Own the UX/creation flow/progression logic; do not bulk-import a third-party dataset's actual
  file/content, and never depend on wger's AGPL codebase directly.
- **Rejected**: importing wger's application code (AGPL is a real license concern for anything
  bundled into this repo); a bulk verbatim import of free-exercise-db's or any other dataset's
  file (kept the same "own the UX, don't build/import a proprietary database" line NUTRITION
  already drew, applied to a second domain).
- **Built (2026-09-12)**: `src/domain/workout/exerciseLibrary.ts`'s `EXERCISE_LIBRARY` — a small
  (~60 entry), hand-authored reference list (generic exercise facts: name/muscle group/equipment/
  rep range), and `src/domain/workout/customExercise.ts`'s `CustomExercise` — a directly-mutable
  personal preset, same treatment as `SavedMeal`. Wired into a new standalone MORE sub-screen
  (`src/ui/screens/more/ExerciseLibraryScreen.tsx`): search the reference list or hand-type a
  fully custom entry, list/edit/archive the personal library. Deliberately not wired into TRAIN's
  substitution field or set logging directly and does not alter the built-in
  `WORKOUT_TEMPLATES` — see `docs/agent/drops/TRAIN-CREATE-001.md`'s exclusions.
- **Built after that original entry:** `CustomWorkoutTemplate`, its validation/commands/queries and
  `CustomTemplateScreen` now assemble exercises into selectable owner-created templates. TRAIN,
  history, programme assignments, Weekly and Week Planner resolve them through
  `application/customTemplateQueries.ts`. They deliberately do not enter the Engine's locked
  built-in A → B → C suggestion. The remaining gap is guided, goal-aware composition and explicit
  plan approval—not a missing custom-template primitive.
- **Ruling on file**: schema addition — owner sign-off obtained 2026-09-12 (direct chat ruling,
  see `docs/UX_DECISIONS.md`'s WORKOUT LIBRARY entry).

## TRAIN experience

### GRAYSON integrated health mission design (2026-11-20 candidate)

- [`GRAYSON_INTEGRATED_HEALTH_MISSION.md`](../GRAYSON_INTEGRATED_HEALTH_MISSION.md) audits the current
  TRAIN/Body/Food/Recovery foundation and proposes connected phased health planning, a guided
  three-session full-body draft, Planet Fitness equipment awareness, bodyweight home/minimum
  fallbacks, physical-standard provenance and evidence-bounded review.
- Preserve fixed A/B/C, progression/re-entry/deload, custom templates, programme assignments, live
  execution and history. The recommended first future slice is a read-mostly confirmation preview
  built from those primitives; it does not authorize writes, Engine changes or Mission semantics.
- Donor ruling: adapt equipment/feedback patterns from Fitbod and observed muscle distribution from
  Hevy; ideas only from MIT GainPath/Workout Planner; no wger AGPL code; free-exercise-db bulk reuse
  stays deferred under the existing owner ruling.

- **Built — GYM-UPGRADE-001:** the existing TRAIN/Gym command path includes optional warm-up kind
  and reps-in-reserve; absent legacy kind remains working. Shared `isWorkingSet` bounds statistics;
  effort does not enter recommendation rules. `SetDetails` shares normal/Gym controls and
  `getWorkoutRecap` compares matching lifts in the same template/variant. Native backup stays
  generic; no second workout store. [Brief](GYM-UPGRADE-001.md).

- **Existing primitive**: `src/engine/progression.ts` (per-exercise INCREASE/HOLD/REDUCE,
  locked doctrine), `TrainScreen.tsx`.
- **Approved donor direction (DONOR-001, exploratory close 2026-08-27)**: a specific Wave-A
  prototype slate is already designed and prioritized — Prepared Set Row, Set Commit
  Choreography, Persistent Rest + Ambient timer, Workout Secured closure. Ten TRAIN Experience
  Laws and a NOW/TREND/JOURNEY information model are recorded as the governing synthesis.
- **Rejected from this research**: dashboard-for-dashboard's-sake, timer clutter, confirmation
  dialogs on routine set commits, vibration on every tap, streak/engagement mechanics.
- **Built (2026-09-02, PR #68)**: the full Wave-A slate is shipped. Prepared Set Row was found
  already implemented before this PR (pre-filled input via `getLastPerformedSetForExercise`/
  `suggestedInputFor`, plus "SAME AS LAST TIME"); this PR added Set Commit Choreography
  (auto-rest-start + LIFO undo), Persistent Rest + Ambient timer (absolute-timestamp countdown,
  ±15s, ambient compression after 8s idle), and Workout Secured closure — all live in
  `TrainScreen.tsx` today. Confirmed independently 2026-09-12 (a fresh session re-checked this
  entry against the actual code and PR history before starting new TRAIN work, rather than
  assuming this ruling meant the work was still pending).
- **Ruling on file**: build the Wave-A prototype slate — owner sign-off obtained 2026-09-02.

## GENERAL DEPENDENCY/TEST TOOLING

- **fast-check** (property-based testing, dev-only) — identified as the leading candidate for
  correction-chain, export/import equivalence, deterministic event-ordering, and
  one-primary-recommendation invariants (Round 4 audit, 2026-08-22). Dev dependency only.
- **Lucide React** (ISC) — **ADOPTED 2026-09-30 (Drop 3, direct owner approval)** via
  `src/ui/icons/LineIcon.tsx`, for row icons the locked glyph family doesn't cover. Earlier note:
  approved/eligible for a restrained icon grammar since the Trust &
  Feel research rounds (2026-08-17/18), deliberately not adopted while the UI was still small
  enough for text-first affordances. Re-evaluation trigger from that same research: "when a
  repeated icon grammar can remove text clutter without reducing accessibility" — worth
  re-checking now that `TodayScreen.tsx`/`TrainScreen.tsx`/`BodyScreen.tsx` combined carry 300+
  inline `style={{}}` occurrences and no shared visual grammar.
- **Sonner, Radix primitives, Recharts, React Aria**: remain eligible-but-not-adopted per
  multiple prior audit rounds — re-evaluate only when a concrete, named implementation need
  appears (a real modal/destructive-confirmation flow, cross-navigation transient feedback, or a
  History & Insight chart with a named decision question), not preemptively.
- **GitHub-native CodeQL / Dependabot / secret-scanning**: flagged (Round 4 audit) as the
  preferred baseline "before growing API/AI credential usage" — relevant now that a GitHub App
  Builder identity with real installation tokens/private key exists.

## Out of scope reminders (do not re-litigate without new evidence)

Universal Entity/knowledge-graph/vector-DB/RAG architecture, a generic task-manager philosophy
for Obligations, a proprietary food database, full pantry/inventory ERP, a personal CRM, and
outsourcing recommendation arbitration to a generic rules/policy engine are all explicitly
rejected in the source research, not merely undecided. Reopen only on a specific new fact, not a
fresh general review.


## WORK PREPARATION

- PREP-001 adds `application/preparation.ts`: operator-confirmed food/snacks and bottle facts,
  append-only PREPARATION_RECORDED events scoped to the current lived day. Causal supersession,
  atomic item ownership/idempotence, existing backup/history and native WorkPreparation sheet.
- Preparation is not consumption, inventory, an Obligation or Engine input. Reuse this path
  before inventing another checklist or marking packed food/water as eaten/drunk.
- Scope, authority, tests and active PR: [PREP-001.md](PREP-001.md). Spending remains separate.

## ROTATION / PERSONAL RANGES

- **Work-context resolution (CONTEXT-INTEGRATION-001):** `application/workContextResolution.ts` is the one read-only
  answer to "work or off, and how do we know" for a lived day: RECORDED (a lived-day record, `by` operator or
  schedule-at-day-start, or a confirmed exception at day start) → CONFIRMED (an active row in `scheduleExceptions`,
  SCHEDULE-EXCEPTIONS-001: `application/scheduleExceptions.ts`; read with `getConfirmedExceptions`) → PREDICTED (saved
  rotation) → UNKNOWN (nothing recorded, no saved schedule). Week Ahead (`basis` per day), the energy
  forecast, Life State's WHY, Alfred's context, the free helper and the training programme read it. Reuse it rather
  than calling `scheduledWorkContextForLivedDay` directly in a new consumer. Shift What-If stays hypothetical.
  `shiftRun(now, pattern, 21, confirmed)` takes `getConfirmedKinds()` so run positions agree (FIELD-READINESS-001).
  `application/ahead.ts` `deriveAhead` names the next work/off switch from Week Ahead's days (OPERATOR-EXPERIENCE-001);
  reuse it for any "what's next" surface (Alfred, header) rather than re-deriving. `application/todayPicture.ts`
  bundles TODAY's NOW (Life State) and NEXT for Alfred's context and the free helper (slice 2).
  `application/sinceLastLook.ts` diffs TODAY's band between visits (device-local snapshot, slice 3).
  `application/livedDayMap.ts` places a lived day's recorded marks on the 16:30 → 16:30 bar (DAY-MAP-001); reuse it for
  any day timeline rather than re-querying.

- ROTATION-002 extends Whole Picture's Rotation tab: `PictureRow.sleepWindow`/`shiftWindow`
  (Garmin times behind a day's single uncorrected main sleep; scheduled shift on recorded work
  days) in `application/wholePictureQueries.ts`; `runPositions`/`nextDaysOff` in
  `application/rotationProjection.ts`; actogram, patterns and next window in
  `ui/screens/review/RotationMap.tsx`.
- `domain/health/unusual.ts` is the multi-day "outside your own range" rule (10th–90th
  percentile, minimum widths, per-kind steps). TODAY's Garmin tiles show it via
  `measuredQueries.unusual`. It deliberately is not an advisory source: that would be an Engine
  change; revisit only with approval. Reuse it before writing another anomaly rule.
- Scope and authority: [ROTATION-002.md](ROTATION-002.md).
- ROTATION-003 adds `flips`/`flipSummary` (rotationProjection) and `PictureRow.napMinutes`: recent
  switches into and out of work runs, aligned actograms, usual times and a gated nap comparison.
- Test note: `expect.poll`/`expect.element` advance faked timers by their interval on each retry.
  A test that sets the clock just before a boundary must wait on real time (see
  `tests/browser/ModePinExpiry.test.tsx`, `beforeTheEdge`).
- SLEEP-ENGINE-001: `engine/sleepStreak.ts` (two short main sleeps vs personal baselines) is the
  Engine's only sleep input; `evaluate`'s trace carries it and `traceShortSleepStreak` reads it
  back for TODAY/TRAIN. Extend this path, not a parallel one, for any future sleep-aware advice.
- ROTATION-004: `PictureRow.marks` (meal/water event times, workout starts, undone excluded) feed
  the actogram's meal/water/workout marks. Reuse it for any "what happened when" view.
- LOOP step 1 (ASK): `application/askProjection.ts` answers fixed questions by rules over
  Whole Picture rows, reusing runs/positions/flips and marks; each `AskLine` carries its source
  rows for tap-through, and `NOT_YET` names what is missing. Add new questions there
  ([LOOP.md](LOOP.md)), not as free text or AI.
- LOOP step 2 (REFLECT): `application/reflect.ts` — decline reasons are journal entries with
  `linkedRecommendationId`; shift debriefs are journal entries titled "Shift debrief"; both get
  "How did it go?" (`getFollowUpsDue`, the journal's own review) from the next lived day. Reuse
  this for any "you said X, how did it go?" loop rather than a new record kind.
- LOOP step 3 (TRY): `application/tryExperiment.ts` — experiments are journal entries ("Try: …" +
  a fixed window line); `experimentResult` compares in-window days with usual days of the same
  kind from Whole Picture rows, with counts, a 95% interval on the difference of means, an "about
  the same" band, and "can't tell yet" / "not enough data yet" when the range is inconclusive or a
  side is thin. Reuse for any bounded personal comparison.
- LOOP step 4 (REMEMBER): `application/remember.ts` returns your own reviewed conclusions at the
  matching moment by structure (same recommendation kind, next shift's PREP, next experiment).
  Extend it for new "when this comes up again" moments; keep it informational.
- SUIT-ALIVE S2 (cave, Vitals): `application/caveVitals.ts` composes one reading in depth from
  the SYSTEMS readout and Whole Picture, using the personal-baselines range rule and run
  positions. Reuse it for any "this reading against my normal" view instead of re-deriving ranges.
- The emblem (BRAND-MARK-003): `ui/components/Emblem.tsx` draws BEYOND's emblem plate from its one source,
  `docs/brand/beyond-emblem/` (BRAND-MARK-003, Brand Drop v2; supersedes the bat and the split bat). The chamfered plate is the in-app logo everywhere (`src/ui/components/Emblem.tsx`).
- SUIT-ALIVE S3 (comms, Tonight): `application/caveTonight.ts` ranks complete readings by distance
  outside your own usual range and lists overdue commitments; `describeComms` is TODAY's comms line.
  Reuse it for any "what's off my normal right now" view.
- SUIT-ALIVE S4 (route): `application/caveRoute.ts` builds the lived day's points (schedule, usual
  sleep and wake, rollover) and in-app callouts. Reuse it for anything time-of-day on the current day.
- SUIT-ALIVE S5 (pace): `application/pace.ts` gives your usual protein or water by any minute of the
  lived day from past logs. Reuse it to judge any running total; never judge one against a full day.
- SUIT-ALIVE S6 (brief): `application/caveBrief.ts` polls pre-shift systems from your own records and
  builds the planned-vs-actual after-action. Reuse it for any checklist or shift review.
- SUIT-ALIVE S7 (file): `application/caveFile.ts` gives findings over run positions, FIRM / BUILDING /
  THIN calibration and the whole run, from Personal Understanding's query. Reuse it, not a second store.
- SUIT-ALIVE S8 (vision, log): `ui/vision/` gives presentation-only vision modes (AUTO night on shift) as
  token overrides; `application/caveLog.ts` rebuilds what the cave said from records. Reuse both.
- CAVE-DATA D1: the cave lives in DATA (`BodyScreen` overview → `Cave` with a `lead` view). Open it with
  App's `openCave(view, vital?)`; never mount a second cave.


## Connected personal OS — design research, 2026-10-31

[PERSONAL-OS-001](PERSONAL-OS-001.md) pins inspected external revisions and license evidence.
LifeOS TELOS/current-vs-desired and source-aware context are candidate patterns, not an installed
harness. MiLyfe public civic repositories do not establish the owner's exact recalled reference;
AGPL source is not cleared for copying. amanaiproduct/personal-os is CC BY-NC-SA, not permissive
software. LifeOsApp is MIT, but its storage/shell do not fit BEYOND's history/atomic commands.
No donor source copied, dependency added or implementation approved. Reuse existing personal
understanding, memory, Intent and Alfred before a new store or dashboard. Goals/Projects design
is parked; connected context/planning design awaits owner scope approval.


### PERSONAL-CONTEXT-001 — implementation branch, not yet merged

`application/alfred/personalContext.ts` composes typed source references from existing records;
new personal sources are conversation-opt-in. `contextActions.ts` guards each proposal's own
source/day/task snapshot atomically with existing canonical commands. MEMORY-001 supports
DIRECTION/CONSTRAINT without a new table; PREP/recovery filters stay bounded. Personal
Understanding has the local editor/planning entry; Alfred sources navigate original records.
See [brief](PERSONAL-CONTEXT-001.md) and active checkpoint for verification/review/merge status.
No new library, model, notifications or Engine rules. Reuse these paths before a new profile store.


### OPERATOR-CONTEXT-002A — approved implementation, integration pending

`application/operatorContext.ts` is the common read-only source/coverage assembler; domain types
live in `domain/operatorContext.ts`. `alfred/personalContext.ts` and automatic `alfredContext.ts`
serialize the same bounded record model with purpose-specific sharing. `OperatorContextPanel`
provides local inspection in LIFE/Memory. Two memory stores remain distinct; no migration occurred.
Reuse these adapters rather than adding a third profile store. Status/limits: [brief](OPERATOR-CONTEXT-002A.md).

### OPERATOR-CONTEXT-002B — new personal facts and explicit legacy conversion (2026-11-01)

Approved bounded work: [#368](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/368).
`application/memory.ts` reuses the causal MEMORY_RECORDED lifecycle for global PERSONAL_FACT
records with topics; old kinds keep day guards and opt-in sharing. `alfred/alfredMemory.ts` is a
compatibility view/command gateway, not a second new store: remember/People/Home now create events,
retired facts stay out of active context/search, and conversion retains an explicit immutable origin.
`MemoryPanel` owns corrections/history/restore; `AlfredMemoryList` offers bounded original-entry
inspection, physical deletion of unconverted rows and individually confirmed conversion. No bulk
migration; both stores still exist while originals remain. BUILD OWNED integration using existing
atomic writes, proposal cards, common context projection and native backups; no new dependency.

### GRAYSON-GUIDED-START-001 — guided confirmed understanding (candidate)

`ui/screens/more/GuidedOverview.tsx` now composes the existing optional starting paths with a small
one-question teaching journey. Draft answers remain mounted UI state; related established context is
read through `getMemoryFacts`; only **CONFIRM & REMEMBER** calls the existing `recordMemory` command
to create an operator-authored `PERSONAL_FACT`. `MemoryPanel` remains the canonical inspection,
correction and retirement surface. Reuse this composition for later guided subjects; do not add a
parallel profile, session store or memory command. Status and exact boundaries:
[`GRAYSON-GUIDED-START-001.md`](GRAYSON-GUIDED-START-001.md).

### ATTENTION-001 — connected TODAY/LIFE presentation (2026-11-01)

Approved bounded objective: [#370](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/370).
Primary TODAY reuses its existing next/log ordering, attention and actual-phase truth. AlfredBrief's
optional recessed rendering keeps generation/cache guards mounted; TodayReviewSupport combines
presentation of existing AlfredWeek and WeeklyReviewReadyLine without merging their records or
readiness rules. Current-moment routines group behind one entry. LIFE retains mounted tabs and
routes personal-fact creation through MemoryPanel; AlfredMemoryList handles legacy evidence only.
BUILD OWNED composition on existing native disclosures and brand tokens; no new recommendation
policy, library, database or provider. Separate COMMAND operating surfaces retain their behavior.

### LIFE-PATTERN-001 — shared screen sections (2026-11-05)
- Reuse `src/ui/components/Section.tsx` (`Section`, `SectionEmpty`, `SectionUnavailable`, `RecordedCount`,
  `MoreSections`) and `src/application/sectionRead.ts` (`readSection`) before building a section header,
  empty state or per-source failure on any screen. Guide: [LIFE-PATTERN-001](LIFE-PATTERN-001.md).
- CONNECT-001: `src/application/connectionQueries.ts` (`getConnections`) and `src/ui/components/Connections.tsx` list
  explicit `[[links]]` to a record. Reuse before building another backlink or "related" view.


### HARVEST-003 — signature features and the wiring map (2026-11-19)

- [Research, wiring map and proposed plan](harvest/HARVEST-003.md): 11 apps (Rise, Timeshifter, Fitbod, WHOOP,
  Exist.io, MacroFactor, Hevy, Gentler Streak, Oura, Garmin Connect IQ and Finch), each checked against BEYOND's code.
  New to BEYOND: a shift energy curve with a fatigue warning, photo meals as itemised USDA foods, automatic "what moves
  your numbers", a muscle-freshness map, and a lock-screen workout. The wiring gaps are W1–W6. Research only: the build
  waits for Gavin's approval of section 4.

### HARVEST-002 — whole-product direction check (2026-11-15)

- [Research and classification](harvest/HARVEST-002.md): current master `5d78a5dd` breadth inventory spans daily use, training, nutrition, recovery, habits, shifts, planning and review/Alfred; capture/planning received the deeper reference comparison. Raw capture, Notes Sweep, Saved sorting and search already exist. Latest primary-source licences verified: Super Productivity MIT; Vikunja AGPL; Loop GPL (latter two ideas only).
- [One proposed Claude mission](harvest/HARVEST-002-CLAUDE-MISSION.md): finish existing week-planner PR #529 on its own branch, currently draft/conflicting, with fresh integration, independent exact-head review, green CI and Gavin's merge. Do not build a competing planner or implement the other ranked candidates automatically. Recommendations and unresolved field questions are explicit; this index changes no governance rule.

### CHP-001 / HARVEST-001 — accepted research baseline (2026-11-14)

- [Capability Harvest Protocol](CHP-001.md) records the three approved refinements: inspect locked decisions,
  record reference licences before reuse, and preserve/index harvests with findings separated from recommendations/questions.
- [HARVEST-001](harvest/HARVEST-001.md) preserves the accepted whole-product baseline and lifestyle-logging parity gaps.
  Research recommendations are not implementation approval. Reuse its licence/decision findings before repeating discovery.
- [ALFRED-FIX-001](ALFRED-FIX-001.md): `application/alfred/fixEntries.ts` (+ pure `fixEntryRules.ts`) resolves and confirms Alfred's and the free helper's `fix_entry` cards over `logEntries.ts`. Extend it (sleep, weight) rather than adding another correction path.
- [TIMELINE-EDIT-001](TIMELINE-EDIT-001.md): `application/logEntries.ts` is one meal/water/protein entry and its three fixes (move, correct, remove) over the existing facts; `ui/components/LogEntrySheet.tsx` is its sheet. Alfred's fix proposals (ALFRED-FIX-001) should call these.
- [FOOD-SOURCES-001](FOOD-SOURCES-001.md): `application/foodSources.ts` groups corrected meal and protein logs into sources over finished lived days; `ui/metrics/FoodSources.tsx` lists them. Reuse it for any "what contributed" view.
- [TARGET-PROPOSAL-001](TARGET-PROPOSAL-001.md): `application/targetProposal.ts` turns `engine/expenditure.ts`'s weight-trend burn estimate and the stored goal weight and weekly rate into a weekly calorie proposal (Weekly, save or keep). Reuse it for any target suggestion; it never writes.
- [METRIC-PAGE-001](METRIC-PAGE-001.md): `ui/metrics/MetricDetailSheet.tsx` with `application/metricDetail*.ts` is the shared metric page (hydration, steps, resting heart rate, calories as eaten beside burned). `direction90` gives its 90-day-against-the-year line. Add a metric here, keeping its own week/source semantics, rather than another detail sheet. Sleep keeps `SleepPeriods` (richer).
  `application/metricDetail*` composes the existing day ledger and measured snapshot; `ui/metrics/MetricDetailSheet`
  shares inspection from TODAY/DATA. Reuse canonical periods, corrections and source routes; do not expand to other
  metrics before owner assessment. Integration status and verification live in the checkpoint/PR.
- [EXPORT-001](EXPORT-001.md) is the brief for HARVEST-001 backlog #5 (readable CSV export). Brief only: no code,
  no builder assigned; the build waits for Gavin's go. Reuse `deliverCalendar` and the existing read queries.



### HABIT-RHYTHM-001 — explicit answers and lived-day history (2026-11-14)

- Approved scope: [brief](HABIT-RHYTHM-001.md), accepted harvest's lifestyle-logging parity follow-up.
- Reuse `domain/habits.ts`'s answer projection: legacy false is an undo/unrecorded, not an explicit No.
  `application/habitCommands.ts` appends additive explicit HABIT_SET answers atomically; existing
  setHabitDone/getHabitDone callers keep their compatibility meaning. No table/migration introduced.
- `getHabitWorkspace` composes a read-only 28-day calendar from existing day records, local 16:30
  boundaries and canonical labelled recorded/confirmed/planned work context. Corrections target original records; gaps
  do not create history. `HabitsPanel` reuses foundation panels and native LogSheet focus handling.
- Quit tracker, reminders, new schedule semantics and health correlations remain excluded.
  Integration/review status belongs in the checkpoint and PR, not this capability index.

### HABIT-QUOTA-001 — "N times a week" habits (2026-11-18)

- Approved scope: [brief](HABIT-QUOTA-001.md); closes HARVEST-002's "Habit quota" row.
- `TIMES_A_WEEK` with `schedule.perWeek` (1 to 6). `habitApplies` takes the week's earlier Done count; Monday-start
  weeks of lived days, the same week as the existing "this week" count. Only Done counts; unknown never fills a week.
- `getHabitToday` reads this week's lived days only and returns `week: { done, target }`; BODY chips use it.

### SHIFT-CORRECT-001 — explicit work-mark corrections (2026-11-15)

- Approved scope: [brief](SHIFT-CORRECT-001.md); WORK TRANSITION amended in the Decision Register.
- Read work marks only through `getWorkMarks` / `getWorkPeriodStarted` / `getWorkPeriodEnded` (application) or the pure
  `effectiveWorkMarks(events)` (engine); never `events.find(type === "WORK_PERIOD_ENDED")`, which ignores retimes and
  reopens. Write corrections only via `retimeWorkMark` / `voidWorkMark`.
- `application/shiftMarks.ts` (sheet view + automation note), `ui/components/ShiftMarkSheet.tsx`; `LogTimeEditor`
  takes an optional `retime` for anything that isn't a log. The free helper exposes `parseClock`/`clockOf`.
- Alfred cards: the registry (`application/alfred/alfredTools.ts`, ALFRED-TOOLS-001) now has an optional `note` line.

## C4.2a — owner-editable caffeine cutoff (PR #595; pending review/merge)

- [Narrowed brief](GRAYSON-C4.2a-001.md): reuse existing ROUTE card, schedule-row configuration, validation, native backup, explicit save and guarded undo. `sleepPlanSettings.ts` stores owner-set hours/time; `shiftSleepPlan.ts` and TODAY use that setting.
- No automated Delta suggestion, short-sleep trigger, confidence, decline timer or personalized-benefit claim remains. The removed `cutoffProposal.ts` is not an available primitive.
- General caffeine research does not demonstrate Gavin's caffeine exposure, adherence or cause of poor sleep. The 6 h value is an app default, not a proven safe personal cutoff.
- Future caffeine experimentation is deferred to a separately authorized objective using the existing experiment lifecycle, with exposure/adherence context, duration, outcome measures, stopping conditions, provenance and owner consent. No new caffeine tracker or experiment is built here.
