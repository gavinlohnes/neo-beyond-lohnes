---
id: TRAIN-CREATE-001
baseline: f2e7d9b6c2abb7d08d6ec429c26c8188c8347712
risk_tier: HIGH-RISK
---

# TRAIN-CREATE-001 // Personal Exercise Library

## Mission

Direct owner ruling, 2026-09-12 (in chat): "Id rather get the work out stuff going. We have
plenty of things to pull from for good ideas. Apps and open source. Id really like this to be an
awesome part of beyond." — a general authorization to build toward BEYOND replacing the "guider
and creator" half of a workout tracker, not just the tracker TRAIN already is. TRAIN Wave-A
(Set Commit Choreography, Persistent Rest, Workout Secured — DONOR-001) was independently found
to already be fully shipped (PR #68, merged 2026-09-02) before this Drop began, so this is the
actual first slice of new ground: a personal exercise library the operator can draw on, seeded
optionally from a small hand-curated reference list (informed by the shape of permissively
licensed open exercise datasets — free-exercise-db, Unlicense; wger, code AGPL but exercise data
CC-licensed separately — not bulk-imported from either), or fully self-defined. This is
deliberately the foundation, not the whole ambition: it does not yet let the operator assemble
exercises into a new selectable workout template alongside the fixed A/B/C system — that is a
distinct future Drop this one is designed to feed.

## Approved baseline

`origin/master` at `f2e7d9b6c2abb7d08d6ec429c26c8188c8347712`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

HIGH-RISK. Trigger: persistence schema/migration (`src/persistence/db.ts` gains a new table,
`customExercises`, at a new Dexie version). No Engine change, no correction-model change, no
protected-fixture change, no new npm dependency (the reference list is hand-authored data in the
domain layer, not a package).

## Authorized scope

- New domain type `CustomExercise` (`src/domain/workout/customExercise.ts`) — a small,
  directly-mutable reusable exercise definition, same treatment as `SavedMeal`
  (`domain/common/types.ts`): create/edit/archive change the record itself; no event trail for
  "what exercises exist."
- New hand-curated static reference list `EXERCISE_LIBRARY` (`src/domain/workout/exerciseLibrary.ts`)
  — generic exercise facts (name / muscle group / equipment / typical rep range), inert
  browse/search-assist data only, never mutated at runtime.
- `src/persistence/exerciseValidation.ts` — zod input/modify/record schemas, mirroring
  `nutritionValidation.ts`'s pattern exactly.
- `src/persistence/db.ts` — new `customExercises` table at the next Dexie version, purely
  additive, no upgrade callback needed (no prior equivalent data to seed/migrate).
- `src/application/exerciseLibraryCommands.ts` — `createCustomExercise`, `updateCustomExercise`,
  `archiveCustomExercise`.
- `src/application/exerciseLibraryQueries.ts` — `getCustomExercises`.
- New UI surface `src/ui/screens/more/ExerciseLibraryScreen.tsx`, reachable from MORE (same
  placement pattern as the Decision Journal and Missions & Obligations) — not a new primary
  bottom-nav destination. Search the bundled reference list or hand-type a fully custom entry;
  list/edit/archive the personal library.
- `docs/UX_DECISIONS.md` — a new locked "WORKOUT LIBRARY" decision entry recording this Drop's
  scope and its relationship to the existing "No broad exercise database" TRAIN doctrine (that
  doctrine is about why the fixed A/B/C templates don't pull from an open exercise database, not
  a blanket rule against a personal library ever existing elsewhere — this Drop makes that
  boundary explicit rather than leaving it ambiguous).
- `docs/agent/CAPABILITY_MAP.md` — a new "WORKOUT CREATION / EXERCISE LIBRARY" Reuse Gate entry,
  same shape as the existing NUTRITION entry.
- Tests: `tests/integration/exerciseLibrary.test.ts` (CRUD + backup/restore round-trip) and a
  real-browser smoke test for the new screen.

## Explicit exclusions

- No change to `WorkoutTemplateId`, `WORKOUT_TEMPLATES`, `getReducedExercises`, or any other part
  of the fixed A/B/C template system in `src/domain/workout/types.ts`.
- No change to `src/engine/progression.ts` or `src/engine/trainSuggestion.ts` — Engine/
  recommendation logic is entirely untouched.
- No wiring of `CustomExercise` into `TrainScreen.tsx`'s substitution field, set logging, or any
  other TRAIN execution surface — this Drop's library is a standalone management surface only.
  Consuming it from TRAIN is deliberately out of scope, left to a future Drop.
- No ability to assemble saved exercises into a new selectable workout template/program — that is
  the next, larger, separate Drop this one is designed to feed.
- No bulk import of any third-party dataset's actual file/content. `EXERCISE_LIBRARY` is
  hand-authored generic exercise facts only.
- No calorie/macro/nutrition work — that is a separate authorized-but-not-yet-scoped line of
  work from the same conversation, tracked independently.

## Relevant authority / references

- Direct owner ruling in chat, 2026-09-12 (quoted in Mission above).
- `CLAUDE.md`'s "Escalate before continuing" — this Drop does not change recommendation
  priority, TODAY/TRAIN/BODY/MORE primary information architecture (a new MORE sub-screen is the
  same non-primary-nav pattern the Decision Journal already used), or Mission/Obligation
  semantics, and removes no existing capability. It does introduce a schema addition, which is
  the HIGH-RISK trigger this contract classifies against and for which today's chat ruling is the
  owner sign-off.
- `docs/agent/drops/NUTRITION-001.md`-equivalent precedent (see `docs/UX_DECISIONS.md`'s
  NUTRITION section and `docs/agent/CAPABILITY_MAP.md`'s NUTRITION entry): the exact template
  this Drop's preset/library split follows — own the UX/creation flow, reference (never
  bulk-copy) an open dataset's shape, directly-mutable preset with no event trail of its own.
  Same pattern now used a second time for a different domain.
  `src/domain/workout/types.ts`'s own doc comment: "Fixed machine-oriented templates ... No broad
  exercise database" — this Drop's authorized scope note above explains why this is not a
  reversal of that line (it constrains the A/B/C template system specifically, not a personal
  library that will feed a *future*, separately-scoped template system).

## Required invariants

- Architecture boundaries hold: `src/domain/**` has no React/Dexie/UI imports; `src/application/**`
  remains the sole gateway to `persistence/db.ts`; `src/ui/**` may import pure domain
  types/functions directly (matching `TrainScreen.tsx`'s existing precedent of importing
  `WORKOUT_TEMPLATES`/`getReducedExercises` from `domain/workout/types.ts`) but never Dexie
  directly.
- `db.ts` version bump is purely additive — every existing table/version's `.stores()` definition
  stays byte-for-byte unchanged; only a new version block is appended.
- `CustomExercise` create/edit/archive never touches, and is never touched by, `WORKOUT_TEMPLATES`,
  `PerformedSet`, or any Engine file.
- No protected fixture (`test-fixtures/protected/**`) is touched.

## Acceptance criteria

- `createCustomExercise`/`updateCustomExercise`/`archiveCustomExercise`/`getCustomExercises`
  behave exactly like their `SavedMeal` counterparts (directly-mutable preset semantics,
  idempotent archive, not-found errors), proven by `tests/integration/exerciseLibrary.test.ts`.
- A `CustomExercise` and the reference-library search both survive a real
  `db.export()`/`db.import()` round trip (same evidence shape as
  `tests/integration/nutritionMealMemory.test.ts`'s backup/restore block).
- `ExerciseLibraryScreen` mounts with no console errors, can search the bundled reference list,
  add a library-seeded or fully custom exercise, and archive one — proven by a real-Chromium
  browser test mirroring `tests/browser/JournalScreen.test.tsx`'s structure.
- `npm run verify` passes in full.

## Required verification

`npm run verify` (architecture boundaries + `tsc -b` + full `vitest run` (node + browser
projects) + production build). Additionally, since this is a schema/migration HIGH-RISK Drop:
the backup/restore round-trip test above, run explicitly and its result stated in the report.

## Builder expectations

- Work only in `../beyond-worktrees/claude-train-create-001` on branch
  `claude/train-create-001`, cut from the baseline above.
- Implement exactly the authorized scope; treat any expansion (especially touching
  `WorkoutTemplateId`/`WORKOUT_TEMPLATES` or TRAIN's execution surface) as a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: check the schema-migration boundary (purely additive?), the
  preset-semantics boundary (matches SavedMeal's proven pattern exactly?), and that no A/B/C
  template or Engine file was touched.
- Every finding evidence-backed, tagged CONFIRMED or PLAUSIBLE.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review.
- Never merges, never self-authorizes a scope change.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- No admin-bypass of any required check, ever.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close TRAIN-CREATE-001 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to open `WorkoutTemplateId` beyond its current fixed union, or to wire
  `CustomExercise` into TRAIN's execution surface, is a scope-expansion STOP, not a judgment
  call — escalate to the owner for a follow-on Drop instead.
- If the reference-library data cannot be kept honestly "hand-authored, not bulk-imported"
  (e.g. an urge to paste in a large verbatim third-party file), stop and escalate rather than
  guess at licensing/provenance.
- A genuine conflict between this contract and `CLAUDE.md`/`docs/UX_DECISIONS.md` that this
  contract's own references don't resolve.
