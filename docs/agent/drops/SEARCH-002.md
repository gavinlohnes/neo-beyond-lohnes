---
id: SEARCH-002
baseline: 9230d6e7464a94be809e8045a5d345362a057f87
risk_tier: ARCHITECTURAL
---

# SEARCH-002 // Personal Search — MiniSearch upgrade

## Mission

Owner asked, 2026-09-15 (in chat, session-wide "just knock stuff out" delegation): improve
in-app search quality. Personal Search 1.0 (`application/searchQueries.ts`) is a deliberate,
documented linear substring scan — its own doc comment says to revisit once corpus size or
relevance-ranking needs actually justify more. This Drop makes that call: swap the substring
scan for MiniSearch's fuzzy/prefix/ranked matching, so a typo or partial word still finds the
right Mission/Obligation/Capture, with the best match surfaced first instead of insertion order.
Tap-to-navigate (`onSelectResult` in `SearchScreen.tsx`, wired from `MoreScreen.tsx`) already
shipped 2026-09-02 and needs no further work — verified directly before scoping this Drop, since
an earlier candidate list for this session mistakenly carried it as still-open.

## Approved baseline

`origin/master` at `9230d6e7464a94be809e8045a5d345362a057f87`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ARCHITECTURAL. Trigger: new runtime dependency (`minisearch`). Owner sign-off already on
record: `docs/agent/CAPABILITY_MAP.md`'s SEARCH entry adjudicates MiniSearch "ADOPT CANDIDATE
FOR FIRST LOCAL LEXICAL SEARCH" (Post-FIELD Intelligence Reuse Audit, 2026-08-22) with "Ruling
on file: dependency addition — High-Risk trigger, owner sign-off obtained 2026-09-02." This
Drop exercises that existing authorization; it does not seek new authorization.

## Authorized scope

- **Dependency**: add `minisearch@^7.2.0` (MIT, zero runtime deps) to `package.json`.
- **Application**: `src/application/searchQueries.ts` — replace the linear substring scan in
  `searchAll` with a MiniSearch index built fresh on every call from the exact same
  `getMissions()`/`getObligations()`/`getAllCaptureItems()` arrays already used today. The
  index remains fully disposable/rebuildable — Dexie/events stay the sole source of truth,
  MiniSearch only ever re-derives from it (per the CAPABILITY_MAP.md constraint: "the index is
  disposable/rebuildable, never canonical truth"). No new Dexie table, no persisted index.
  `searchAll`'s existing signature (`(query: string) => Promise<SearchResult[]>`) and its
  `SearchResult` shape are unchanged — this Drop swaps the matching algorithm underneath the
  same public contract, callers (`SearchScreen.tsx`) need no change.
- Results are ordered by MiniSearch's own relevance score (best match first) instead of
  insertion order (Missions, then Obligations, then Captures).
- Fuzzy matching (small edit-distance tolerance) and prefix matching (partial-word) are both
  enabled — MiniSearch's own `fuzzy`/`prefix` search options, tuned conservatively (e.g.
  `fuzzy: 0.2`) so a genuinely unrelated query still returns zero results (existing test:
  "returns no results for a query that matches nothing" must keep passing unmodified).

## Explicit exclusions

- No change to what is searchable — still exactly Mission title/description, Obligation
  title/description, Capture text. No new field, no new domain.
- No semantic/embeddings/vector retrieval — CAPABILITY_MAP.md's SEARCH entry explicitly
  rejects that path until lexical retrieval (this Drop) demonstrates a real remaining gap.
- No change to `SearchScreen.tsx`'s or `MoreScreen.tsx`'s tap-to-navigate behavior — already
  shipped, out of scope, verified unchanged.
- No persisted search index, no background indexing job, no new Dexie table.
- No relevance explanation/score shown in the UI — `SearchResult`'s own doc comment ("Never a
  match explanation/score") is preserved.

## Relevant authority / references

- `docs/agent/CAPABILITY_MAP.md`'s SEARCH entry — the pre-existing owner sign-off this Drop
  exercises.
- `docs/HARVEST_READINESS_REPORT.md`'s MiniSearch addendum — version/license/shape rationale.
- `src/application/searchQueries.ts`'s own doc comment — the "revisit if corpus size/
  relevance-ranking needs actually outgrow a linear scan" condition this Drop is the revisit of.

## Required invariants

- `searchAll` performs no writes — pure retrieval, matching the existing "performs no writes"
  test's guarantee.
- Every result status is still included (ACTIVE and ARCHIVED Missions, every Obligation
  status, every Capture status) — retrieval is not current-attention eligibility, unchanged.
- The MiniSearch index is rebuilt from canonical Dexie-backed arrays on every call — never
  cached across calls, never itself treated as a source of truth.
- A query with no real matches still returns an empty array (fuzzy tolerance is a bounded knob,
  not an "always return something" behavior).

## Acceptance criteria

- Existing `tests/integration/searchQueries.test.ts` suite passes with matching behavior fully
  preserved.
- A new test proves prefix matching: a partial word (e.g. "reb" for "Rebuild the deck") returns
  the match.
- A new test proves fuzzy matching: a query with one typo'd character still returns the
  intended match.
- A new test proves ranking: given two results where one is a much closer match, the closer
  match is returned first.
- `npm run verify` passes in full.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build). Given the ARCHITECTURAL new-dependency trigger: confirm
`check:architecture` still passes with the new import (searchQueries.ts already sits in
`application/`, which is allowed to import third-party libraries same as any other application
file).

## Builder expectations

- Work only in `../beyond-worktrees/claude-search-002` on branch
  `claude/search-002-minisearch-navigate`, cut from the baseline above.
- Implement exactly the authorized scope; any temptation toward semantic/embeddings search or
  UI changes to SearchScreen/MoreScreen is a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm no persisted index/new Dexie table was introduced, confirm
  the index is genuinely rebuilt fresh each call (not module-level cached across calls in a way
  that could go stale), confirm `SearchResult`'s public shape and `searchAll`'s signature are
  unchanged, confirm the "no results for an unrelated query" guarantee actually holds with the
  chosen fuzzy tolerance.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close SEARCH-002 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to add semantic/embeddings retrieval, a persisted index, or UI changes beyond
  what's already shipped is a scope-expansion STOP.
- A genuine conflict between this contract and higher repository authority.
