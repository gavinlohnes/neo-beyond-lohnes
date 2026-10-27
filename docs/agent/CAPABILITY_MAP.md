# BEYOND Capability Map

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

## NUTRITION

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
  execution surface and does not touch `WorkoutTemplateId`/`WORKOUT_TEMPLATES` — see
  `docs/agent/drops/TRAIN-CREATE-001.md`'s exclusions. Still open: nothing yet lets the operator
  assemble saved exercises into a new selectable workout template/program — that is the next,
  larger, separately-scoped Drop this one is designed to feed.
- **Ruling on file**: schema addition — owner sign-off obtained 2026-09-12 (direct chat ruling,
  see `docs/UX_DECISIONS.md`'s WORKOUT LIBRARY entry).

## TRAIN experience

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
