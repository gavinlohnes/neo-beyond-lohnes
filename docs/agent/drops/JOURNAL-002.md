---
id: JOURNAL-002
baseline: 4edb35f902d4d408b5fb4a2f981e19f34d8f9301
risk_tier: ROUTINE
---

# JOURNAL-002 // Widen Decision Journal relevance matching to include active Missions

## Mission

JOURNAL-001 (shipped earlier tonight) surfaces reviewed Decision Journal Lessons as read-only
advisory context on TODAY, matched only against currently-eligible Obligations' titles. That
narrow pool means a Lesson realistically surfaces too rarely to be useful — most days there is no
Obligation whose title happens to overlap a past journal entry's text. This Drop widens the
query-term pool to also include active Missions' titles (Missions represent durable direction —
typically fewer, longer-lived, and thematically richer than a short Obligation title), directly
authorized by the owner tonight as item 3 of a four-item execution list ("Widen Decision Journal
relevance matching so Lessons actually surface at a useful frequency — not just Obligation-title
overlap, still zero Engine influence, still advisory-only").

## Approved baseline

`origin/master` at `4edb35f902d4d408b5fb4a2f981e19f34d8f9301`, verified via
`git fetch origin master && git rev-parse origin/master` (TRAIN-PROGRESSION-001's own closure
commit — the current master HEAD at Drop launch).

## Risk classification

ROUTINE. Touches only `src/application/advisoryQueries.ts` — one additional already-existing
query call (`getActiveMissions`, already used elsewhere in the app) feeding one more source of
plain text into an already-built, already-approved relevance matcher (`engine/journalRelevance.ts`,
unchanged by this Drop). No engine/domain change, no new dependency, no schema change, no new
producer, no change to `AdvisoryNote`'s shape or to concatenation order. `advisoryQueries.ts`'s
own doc comment already states its job is to "orchestrate/translate only... add no judgment,
threshold, or interpretation of its own" — this Drop adds a second already-correct current-state
data source to that same seam, exactly the kind of widening that doc comment already anticipates,
not a new kind of judgment.

## Authorized scope

- `src/application/advisoryQueries.ts`: `getAdvisoryNotes()` additionally fetches
  `getActiveMissions()` (same eligibility filter — ACTIVE only, matching the "current situation,
  not historical" principle already applied to Obligations via
  `getCurrentlyEligibleUnresolvedObligations`) and concatenates active Missions' titles onto the
  existing Obligation-titles array before calling `findRelevantReviewedEntries`. No other change
  to this function's shape, control flow, or concatenation order.
- Tests: `tests/integration/advisoryNotesQuery.test.ts` — two new cases: a reviewed entry whose
  text overlaps only an active Mission's title (not any Obligation) now produces exactly one
  `AdvisoryNote`, proving the widening actually surfaces something the prior, narrower pool could
  not have matched; a reviewed entry whose text overlaps only an ARCHIVED Mission's title
  produces none, proving the "current situation only" invariant is preserved for the new source
  too.

## Explicit exclusions

- No change to `engine/journalRelevance.ts`, `engine/advisory.ts`,
  `composeAdvisoryNoteFromJournal`, or the `AdvisoryNote` contract — the matcher and composer are
  completely unchanged; only the text handed into the matcher widens.
- No new persisted linkage, no `missionId` field added to `DecisionJournalEntry` — the "same
  Mission" structural-link half of JOURNAL-001's originally proposed design still has no backing
  data and is not attempted here either; this widening is text-overlap-based, same as JOURNAL-001.
- No change to `findRelevantReviewedEntries`'s `limit` parameter or its fuzzy/prefix tuning — the
  reported gap was "too narrow a pool to match against," not "too few results returned once a
  match exists."
- No Engine arbitration change of any kind — `evaluate.ts` remains untouched.

## Relevant authority / references

- Direct owner authorization tonight: approval of a four-item execution list with this as item 3.
- `docs/agent/drops/JOURNAL-001.md`: the Drop this one directly extends: same architectural
  boundary, same "purely a source of matching text" framing for query terms.
- `.claude/rules/engine.md`: composers/relevance functions must receive already-correct
  current-state input from elsewhere; this Drop supplies more of that input, unchanged in kind.

## Required invariants

- `getAdvisoryNotes()`'s concatenation order (Obligations, then Progression, then Decision
  Journal) is unchanged.
- Only ACTIVE Missions contribute query terms — an archived Mission's title must never cause a
  match, mirroring the existing Obligation-eligibility principle.
- `engine/journalRelevance.ts` remains untouched and still receives only plain `string[]` query
  terms, with no new knowledge of where they came from.

## Acceptance criteria

- `npx tsc -b` passes with zero errors.
- `npm run check:architecture` passes.
- `npx vitest run --project node` passes, including the two new integration test cases.
- `npm run build` succeeds.
- A reviewed journal entry whose text overlaps only an active Mission's title (no Obligation
  overlap at all) produces exactly one `AdvisoryNote` with `sourceModule: "decisionJournal"`.
- A reviewed journal entry whose text overlaps only an archived Mission's title produces none.

## Required verification

Standard gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && build`). No browser-project files are touched by this
diff (`git diff origin/master...HEAD -- tests/browser/` is empty), so a full browser-project
re-run is optional per this session's own established practice for untouched surfaces; the node
project's full run above already covers every changed file.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR
and stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing from
this contract and the final diff only, adversarial by default, every finding evidence-backed and
tagged CONFIRMED/PLAUSIBLE, persist exact-head-bound review evidence as a durable PR comment or
review, never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved, reviewed,
green PR; no admin-bypass; closes `ACTIVE_DROP.md` via
`node scripts/factory-drop.mjs close JOURNAL-002 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to add a new persisted field, widen matching beyond plain title text (e.g.
  Mission/Obligation description fields, Capture text), or change the relevance function's
  tuning — stop and treat as a separate, future Drop rather than silently expanding scope here.
- Any discovery that widening the pool causes a genuinely spurious/misleading match in practice
  (not just theoretically possible) — stop and report rather than ship a confusing surfacing.
