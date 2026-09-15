---
id: JOURNAL-001
baseline: e3e03d6f27d42df3369e35ff58f3e65e4ee299d0
risk_tier: ARCHITECTURAL
---

# JOURNAL-001 // Decision Journal Lessons as read-only TODAY advisory context

## Mission

Surface past Decision Journal entries' recorded Lessons as read-only advisory context on
TODAY's Support tier, when the current situation (an eligible Obligation's title text) overlaps
a reviewed journal entry's own text. This is the third independent producer into the existing
Intelligence Spine (`AdvisoryNote`/`getAdvisoryNotes`) established by I1 (Obligations) and I3
(TRAIN progression) — purely informational, never an Engine input, never changing which
Recommendation fires, its kind, or its priority. Directly authorized by the owner via an
`AskUserQuestion` response selecting "Journal integration (Recommended)" over the exact
proposal: "surface past Journal entries' Lessons as read-only advisory context on TODAY's
Support tier when the current situation matches a past entry (same Mission, or overlapping
keywords/tags) ... purely informational ... Explicitly excluded: no scoring Journal history
into `evaluate.ts`, no new persisted linkage beyond what exists today." Direct code review of
`domain/journal/types.ts` during design confirmed `DecisionJournalEntry` has no `missionId`
field at all — so only the "overlapping keywords/tags" half of the approved matching signal is
implemented; the "same Mission" half never had backing data and is not attempted.

## Approved baseline

`origin/master` at `e3e03d6f27d42df3369e35ff58f3e65e4ee299d0`, verified via
`git fetch origin master && git rev-parse origin/master` (DEPS-001's own closure commit — the
current master HEAD at Drop launch).

## Risk classification

ARCHITECTURAL. Triggers the `src/engine/**` "meaningful Engine/recommendation architecture"
tier: a new pure engine module (`src/engine/journalRelevance.ts`) and a new composer function
in `src/engine/advisory.ts` (`composeAdvisoryNoteFromJournal`). Also touches
`src/domain/intelligence/types.ts`'s `AdvisorySourceModule` union (a canonical domain type
widened by one variant). Not HIGH-RISK: no persistence schema/migration, no backup/restore
change, no correction-model change, no protected fixture, no new dependency (MiniSearch is
already a runtime dependency via SEARCH-002). No Engine arbitration change: `evaluate.ts` is
untouched, and `AdvisoryNote` continues to carry no `priority`/`suggestedCommand`/
`RecommendationKind`-shaped field for any producer, including this one.

## Authorized scope

- `src/domain/intelligence/types.ts`: widen `AdvisorySourceModule` to add `"decisionJournal"`.
- `src/application/journalQueries.ts`: add `getReviewedDecisionJournalEntries()`, mirroring the
  existing `getOpenDecisionJournalEntries()` exactly (same sort/validation pattern, filtered to
  `status === "REVIEWED"`).
- New `src/engine/journalRelevance.ts`: a pure, deterministic, zero-I/O function
  (`findRelevantReviewedEntries`) that matches already-fetched `DecisionJournalEntry[]` against
  caller-supplied query terms via MiniSearch (already an approved, zero-new-dependency
  mechanism per SEARCH-002's `searchQueries.ts`), abstaining (returning `[]`) whenever there is
  no genuine overlap.
- `src/engine/advisory.ts`: add `composeAdvisoryNoteFromJournal(entry): AdvisoryNote | null`,
  reshaping a single already-selected, already-REVIEWED journal entry into the shared
  `AdvisoryNote` contract. Returns `null` for an entry with no recorded `lesson` — nothing new
  to say. No relevance judgment lives in this function; that judgment lives entirely in
  `journalRelevance.ts`.
- `src/application/advisoryQueries.ts`'s `getAdvisoryNotes()`: add a third orchestration
  segment — fetch reviewed journal entries, build query terms from the already-fetched
  Obligations array's titles (no new Mission fetch), call `findRelevantReviewedEntries`, map
  matches through `composeAdvisoryNoteFromJournal`, concatenate as a third array segment after
  Obligations and Progression (structural convention, not a priority ranking).
- Tests: `tests/engine/journalRelevance.test.ts` (new), `tests/engine/advisory.test.ts`
  (extended with `composeAdvisoryNoteFromJournal` coverage and an engine-boundary check),
  `tests/integration/advisoryNotesQuery.test.ts` (extended with the third-producer proof).
- This Drop Contract and `ACTIVE_DROP.md`'s pointer update.

## Explicit exclusions

- No scoring or reading of Journal history into `engine/evaluate.ts` — Engine arbitration,
  Recommendation selection, and priority are completely untouched.
- No new persisted linkage beyond what already exists on `DecisionJournalEntry`
  (`linkedRecommendationId`) — no new field, no new index, no schema/migration change.
- No "same Mission" matching — `DecisionJournalEntry` has no `missionId` field; not invented
  here.
- No UI changes — `AdvisorySection.tsx` already renders `AdvisoryNote[]` generically; a third
  `sourceModule` value requires no component change.
- No change to `AdvisoryNote`'s shape itself (no new field) — the existing
  `id`/`sourceModule`/`message`/`basis`/`relatedRecommendationId` contract is reused as-is.
- No new npm dependency — MiniSearch is already installed and approved (SEARCH-002).

## Relevant authority / references

- Direct owner authorization: `AskUserQuestion` response "Journal integration (Recommended)"
  against the exact bounded proposal quoted in Mission above.
- `.claude/rules/engine.md`: composers must receive already-correct current-state input from
  elsewhere; a new producer supplies its own current-state input; `advisory.ts` never contains
  a domain's lifecycle/eligibility rule itself; one-way dependency (`advisory.ts` may import
  from other engine modules' types, never the reverse), regression-tested in
  `tests/engine/advisory.test.ts`.
- `src/domain/intelligence/types.ts`'s own doc comments: `AdvisoryNote` is INTERPRET-stage
  material, never a `Recommendation`, never accepted/declined/executed.
- `src/application/advisoryQueries.ts`'s own doc comments: concatenation order is a fixed
  structural convention, never a priority ranking.
- `docs/agent/CAPABILITY_MAP.md`'s RECOMMENDATION ARBITRATION / OUTCOME MEMORY entry: "nothing
  yet reads a Decision Journal entry back into Engine arbitration or advisory composition" —
  this Drop closes that gap at the advisory-composition layer only, explicitly not at Engine
  arbitration.
- SEARCH-002 (`src/application/searchQueries.ts`): MiniSearch precedent, exact `fuzzy`/`prefix`/
  `boost` tuning reused for this Drop's own relevance match.

## Required invariants

- `evaluate.ts` and `EvaluateInput` remain completely unmodified by this Drop.
- `AdvisoryNote` never gains a `priority`, `suggestedCommand`, or `RecommendationKind`-shaped
  field, for any of the three producers.
- `journalRelevance.ts` stays pure/deterministic/zero-I/O: no import from `application/*` or
  `persistence/*`.
- One-way dependency preserved: `evaluate.ts`, `obligationRelevance.ts`, `progression.ts`, and
  `journalRelevance.ts` never import from `advisory.ts` (regression-tested).
- `advisory.ts`'s new composer contains no relevance-matching logic of its own — it only
  reshapes an already-selected entry.
- Array concatenation order in `getAdvisoryNotes()` remains a structural convention only, never
  read as significance by any consumer.

## Acceptance criteria

- `npx tsc -b` passes with zero errors.
- `npm run check:architecture` passes (no new Engine → application/persistence import).
- `npx vitest run --project node` passes, including the new/extended tests above.
- `npx vitest run --project browser` passes unchanged (no UI files touched).
- `npm run build` succeeds.
- A reviewed journal entry with a recorded lesson whose text overlaps an eligible Obligation's
  title produces exactly one `AdvisoryNote` with `sourceModule: "decisionJournal"`, proven via
  `tests/integration/advisoryNotesQuery.test.ts`.
- An OPEN entry, or a REVIEWED entry with no lesson, or a REVIEWED entry with no text overlap,
  each produce zero notes — proven by the same test file.
- All three producers (`obligationRelevance`, `progression`, `decisionJournal`) coexist through
  one `getAdvisoryNotes()` call, each independently attributed, proven by the same test file.

## Required verification

Standard gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && build`). No additional High-Risk compatibility surface
applies (no schema/migration/backup/protected-fixture/dependency change).

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from
the exact baseline above, implement only the authorized scope, run required verification, open
PR and stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing
from this contract and the final diff only, adversarial by default, every finding evidence-
backed and tagged CONFIRMED/PLAUSIBLE, persist exact-head-bound review evidence as a durable PR
comment or review, never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved,
reviewed, green PR; no admin-bypass; closes `ACTIVE_DROP.md` via
`node scripts/factory-drop.mjs close JOURNAL-001 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any attempt to make this producer influence Engine arbitration, Recommendation priority, or
  `evaluate.ts` in any way — stop and escalate.
- Any need for a new persisted field/index/schema change to make matching work — stop and
  escalate rather than silently expanding scope.
- Any genuine conflict between this contract and `.claude/rules/engine.md` or
  `docs/UX_DECISIONS.md` discovered mid-implementation — stop and escalate.
