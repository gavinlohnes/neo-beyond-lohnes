---
id: TRAIN-CREATE-003
baseline: da314fe3b7e230830da19a21552e155b92f5a1af
risk_tier: ROUTINE
---

# TRAIN-CREATE-003 // Wire CustomExercise into TRAIN's substitution field

## Mission

Continues the documented gap from TRAIN-CREATE-001/002. `docs/UX_DECISIONS.md`'s WORKOUT
LIBRARY entry states: "Not yet consumed by TRAIN. CustomExercise is a standalone personal list
only — not wired into TRAIN's substitution field, set logging, or any execution surface, and
there is no way yet to assemble saved exercises into a new selectable workout template. Both are
explicit exclusions of this Drop, left to a distinct, larger future Drop that this one is
designed to feed." TRAIN-CREATE-002 already closed the second half ("assemble saved exercises
into a new selectable workout template" — Custom Workout Templates). This Drop closes the
smaller, safer half of what remains: the substitution field specifically. Owner delegation
tonight ("just knock stuff out") authorizes proceeding without a further per-task confirmation,
per the standing session-wide "you are in charge" instruction.

Full "set logging... execution surface" integration — treating a CustomExercise as a first-class
loggable exercise with its own progression tracking inside the fixed A/B/C templates — remains
explicitly out of scope (see Explicit exclusions): that is still the larger, more architecturally
significant remainder this Drop does not attempt.

## Approved baseline

`origin/master` at `da314fe3b7e230830da19a21552e155b92f5a1af`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. Additive UI + one new lightweight query composition in `TrainScreen.tsx`. No schema,
domain, or engine change — `PerformedSet.substitutedName` is already a plain free-text
`string | undefined` field (see `src/domain/workout/types.ts`), unchanged by this Drop. No new
Dexie table, no new command. `TrainScreen.tsx` is not a SERIAL-ONLY seam (only
`src/ui/screens/today/**` is, per `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`).

## Authorized scope

- **UI only**: `src/ui/screens/train/TrainScreen.tsx`'s substitution input (the "Substitute
  exercise (optional)" text field and its existing "recent substitutions" quick-pick row).
  - Load the operator's active `CustomExercise` names once via the existing
    `getCustomExercises()` query (`application/exerciseLibraryQueries.ts`) — no new query
    function needed.
  - Merge those names into the existing quick-pick suggestion row alongside
    `recentSubstitutions[exerciseId]` (deduplicated, recent-usage-history entries taking
    priority order first, then any CustomExercise names not already present).
  - Clicking a suggested name fills the same `subs[exerciseId]` free-text state exactly as
    today's "recent substitutions" pills already do — `substitutedName` stays a free-text
    string; a CustomExercise's name is only ever a convenient suggestion, never a foreign-key
    reference.

## Explicit exclusions

- No change to `PerformedSet`, `domain/workout/types.ts`, or any Dexie schema — `substitutedName`
  remains a plain string field, not a reference to a `CustomExercise` id.
- No "set logging" integration — a CustomExercise still cannot be selected as the *primary*
  exercise for a set with its own progression tracking inside the fixed A/B/C template
  rotation; it is only ever offered as a substitution suggestion. That remains the larger,
  distinct future Drop the doctrine entry describes.
- No change to `getRecentSubstitutions`, `logSet`, or any other existing TRAIN command/query
  logic — this Drop only adds one more source of quick-pick suggestions to the existing UI.
- No change to Custom Workout Templates (`TRAIN-CREATE-002`) or the Personal Exercise Library
  screen (`TRAIN-CREATE-001`) themselves.

## Relevant authority / references

- `docs/UX_DECISIONS.md`'s WORKOUT LIBRARY (Personal Exercise Library — TRAIN-CREATE-001, locked)
  entry — the exact gap this Drop closes half of.
- `src/application/exerciseLibraryQueries.ts`'s `getCustomExercises()` — the pre-existing query
  this Drop reuses verbatim.
- `src/application/trainQueries.ts`'s `getRecentSubstitutions` — the existing suggestion source
  this Drop's new suggestions sit alongside, never replace.

## Required invariants

- `substitutedName` continues to be stored and read as a plain free-text string — no new
  validation coupling it to a `CustomExercise` id, so a later CustomExercise rename/archive can
  never retroactively change a past log's `substitutedName` (matches the existing
  correction-history-never-rewritten doctrine already proven for `SavedMeal`/`MEAL_LOGGED`).
- The existing "recent substitutions" quick-pick behavior (recency, per-exercise scoping,
  dedup) is unchanged — this Drop only adds more entries to the same row, never reorders or
  removes existing ones.
- An archived `CustomExercise` never appears in the suggestion row (`getCustomExercises()`'s
  existing default already excludes archived — this Drop does not pass `includeArchived`).

## Acceptance criteria

- With at least one saved `CustomExercise`, opening an unlogged set's substitution field shows
  that exercise's name as a quick-pick suggestion.
- Tapping a `CustomExercise`-sourced suggestion fills the substitution input with that name,
  identically to tapping a "recent substitution" pill.
- An archived `CustomExercise` does not appear as a suggestion.
- A `CustomExercise` name already present in `recentSubstitutions` for that exercise is not
  duplicated in the row.
- `npm run verify` passes in full.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build).

## Builder expectations

- Work only in `../beyond-worktrees/claude-train-create-003` on branch
  `claude/train-create-003-custom-exercise-substitution`, cut from the baseline above.
- Implement exactly the authorized scope; any temptation toward full set-logging integration,
  schema changes, or touching Custom Workout Templates is a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm no schema/domain change, confirm `substitutedName` stays a
  free-text string with no CustomExercise-id coupling, confirm archived CustomExercises are
  genuinely excluded, confirm existing recent-substitutions behavior is unchanged.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close TRAIN-CREATE-003 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to wire a CustomExercise into actual set logging/progression tracking, or to
  add a schema/domain change, is a scope-expansion STOP — that remains the larger, distinct
  future Drop.
- A genuine conflict between this contract and higher repository authority.
