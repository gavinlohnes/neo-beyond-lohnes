---
id: BODY-QUICK-001
baseline: e8908ef4c2fe39b1bc782b0730be34ce258a139c
risk_tier: ROUTINE
---

# BODY-QUICK-001 // RECENT MEAL SHORTCUTS

## Mission

Finish the remaining safe slice of the DAILY-USE campaign's BODY quick-log plan without
duplicating the substantial BODY, Weekly, Quit, and field-soak work that reached master after
the original audit. Saved meals shown in BODY should follow actual recent use, so the presets
the operator logs most often are easiest to reach without new state, automatic logging, or a
second meal surface.

## Approved baseline

`origin/master` at `e8908ef4c2fe39b1bc782b0730be34ce258a139c`, fetched immediately before
creating this worktree on 2026-10-03.

## Risk classification

ROUTINE. This adds one derived application query, changes BODY's presentation order, and adds
tests/documentation. It changes no command, event, schema, correction chain, backup contract,
Engine behavior, domain type, dependency, or navigation.

## Authorized scope

- Add `getRecentSavedMeals(limit?)`, derived from existing active SavedMeal records and
  non-voided `MEAL_LOGGED` history.
- Order used presets by their most recent surviving log; place never-used presets afterward in
  the existing newest-created order. Deduplicate presets, use deterministic tie-breaks, and keep
  every active preset reachable in BODY; the optional limit is for future bounded consumers.
- Have BODY use that query for its existing Saved Meal shortcut list. Do not create another
  Quick Log panel or disturb the field-soak layout.
- Add focused integration and browser coverage.
- Add the DAILY-USE campaign record, noting which originally proposed capabilities already
  shipped before this Drop and which remain deferred by current roadmap/doctrine.

## Explicit exclusions

- No new stored recency field, migration, event, command, or automatic meal log.
- No change to "same as yesterday", correction, void/undo, macro snapshots, USDA search, or
  archived-meal eligibility.
- No layout redesign, new tab, TODAY row, Engine change, Delta/AI work, or external service.

## Relevant authority / references

- Gavin's direct instruction to implement the approved DAILY-USE campaign.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md`: Quick Log, Quiet Intelligence, Human Control, and
  correction/provenance guarantees.
- `docs/ROADMAP_1.0.md`: current field-soak state and deferred post-debrief work.
- `docs/UX_DECISIONS.md`: SavedMeal snapshot/history and BODY correction semantics.

## Required invariants

- Dexie events remain canonical; recency is disposable derived presentation state.
- A voided log contributes neither totals nor recency.
- Archived/invalid presets are never offered, and past logs remain unchanged.
- Logging still requires an explicit operator tap and uses the existing `logMeal` command.
- Existing correction, undo, same-as-yesterday, and offline behavior remain unchanged.

## Acceptance criteria

- A recently logged active preset appears before an older or never-used preset.
- A voided meal log does not make its preset recent.
- Archived or malformed presets never appear.
- Equal-time history resolves deterministically; `limit` is honored; empty/small-N states stay
  unchanged.
- Existing BODY logging, same-as-yesterday, correction, undo, and accessibility tests pass.
- `git diff --check`, focused tests, `npm run check:risk`, and `npm run verify` pass.

## Required verification

- Focused integration tests for recent ordering, voids, invalid/archived records, deterministic
  ties, limits, and empty history.
- Focused real-browser BODY test proving the existing saved-meal list reflects recent use.
- `git diff --check`.
- `npm run check:risk e8908ef4c2fe39b1bc782b0730be34ce258a139c`.
- `npm run verify`.

## Builder expectations

Build only this scope on `codex/body-quick-001`, commit, push, open a PR, attach it to the task,
and stop. Never self-review or self-merge.

## Reviewer expectations

A separate session reviews exact-head behavior and verifies that recency is derived from
surviving immutable history rather than stored duplicate state. A separately authorized
integrator is not assumed by the Builder.

## Integrator expectations

A separately authorized session may merge only after green required checks and review
disposition, then closes the Drop. No admin bypass and no self-merge.

## Stop / escalation conditions

Stop for any required event/schema/correction semantic change, any conflict with the current
field-soak layout, a concurrently active Drop, or a changed `origin/master` baseline.

## Historical governance reconciliation

PR #146 merged as master commit `26e328496f89fc380abb6f98ed3dbcf7f8709727` before the
required independent review and integration bookkeeping were complete. No pre-merge review is
claimed. A separate post-merge Reviewer session subsequently inspected the exact incorporated PR
head `eafb5f44315e4c6ba5e49269a546ecc8ab0e74f3` and reported **PASS WITH GOVERNANCE
RECONCILIATION REQUIRED**, with no product defect. This reconciliation records that verdict,
adds the contract-requested deterministic equal-time test evidence, and closes the Drop only
after those omissions were corrected.
