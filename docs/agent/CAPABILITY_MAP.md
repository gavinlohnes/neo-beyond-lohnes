# BEYOND Capability Map

Repo-native navigation index into Google Drive's `BEYOND — Research & Reuse Register` and
`BEYOND — Donor & Experience Program 1.0` (both owner-approved R&D doctrine). This file is a
pointer/summary, per the Research-to-Build Reuse System's own rule — it does not duplicate full
research prose, and it is not itself product authority. If this map and the Drive documents it
points to disagree, the Drive documents (and any later direct owner ruling) win; treat the
disagreement as something to resolve, not silently pick a side on.

Purpose: a Builder session should be able to answer "has this problem already been researched,
and what did the owner already approve?" in under a minute, without searching Drive by hand.
Per the Reuse Gate this mirrors: routine work should clear in minutes — this file existing is
what makes that possible for BEYOND specifically, instead of requiring a fresh Drive search
every time.

Update this file when a Drop's Reuse Gate disposition produces a durable finding worth
preserving for the next session (the "Post-Drop Reuse Harvest" step in the Research-to-Build
Reuse System) — not on every Drop, only when it validates or changes something below.

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
  Still open: nothing yet reads a Decision Journal entry back into Engine arbitration or
  advisory composition — this Drop only builds the journal itself.
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

## TRAIN experience

- **Existing primitive**: `src/engine/progression.ts` (per-exercise INCREASE/HOLD/REDUCE,
  locked doctrine), `TrainScreen.tsx`.
- **Approved donor direction (DONOR-001, exploratory close 2026-08-27)**: a specific Wave-A
  prototype slate is already designed and prioritized — Prepared Set Row, Set Commit
  Choreography, Persistent Rest + Ambient timer, Workout Secured closure. Ten TRAIN Experience
  Laws and a NOW/TREND/JOURNEY information model are recorded as the governing synthesis.
- **Rejected from this research**: dashboard-for-dashboard's-sake, timer clutter, confirmation
  dialogs on routine set commits, vibration on every tap, streak/engagement mechanics.
- **Ruling on file**: build the Wave-A prototype slate — owner sign-off obtained 2026-09-02.

## GENERAL DEPENDENCY/TEST TOOLING

- **fast-check** (property-based testing, dev-only) — identified as the leading candidate for
  correction-chain, export/import equivalence, deterministic event-ordering, and
  one-primary-recommendation invariants (Round 4 audit, 2026-08-22). Dev dependency only.
- **Lucide React** (ISC) — approved/eligible for a restrained icon grammar since the Trust &
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
