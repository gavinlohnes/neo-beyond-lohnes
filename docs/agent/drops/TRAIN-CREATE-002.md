---
id: TRAIN-CREATE-002
baseline: f826f22aed688f9f4db67b346b0f91efbd65ca56
risk_tier: HIGH-RISK
---

# TRAIN-CREATE-002 // Custom Workout Templates

## Mission

Direct continuation of the "get the workout stuff going" authorization (owner ruling, 2026-09-12
chat) and TRAIN-CREATE-001's own stated purpose ("the foundation for a future, separately-scoped
workout program/creation Drop... not that Drop itself"). Tonight the owner additionally
delegated execution authority for the session ("Can you be in charge with app development
tonight? ... You are in charge of keeping us productive"), reserving only genuine yes/no calls
for escalation-worthy decisions. This Drop is that next piece: let the operator assemble their
saved exercises (TRAIN-CREATE-001's personal library) into a named custom workout template,
selectable in TRAIN alongside the fixed A/B/C templates, fully usable for real workout sessions
(start, log sets, progression advisory, completion).

## Approved baseline

`origin/master` at `f826f22aed688f9f4db67b346b0f91efbd65ca56`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

HIGH-RISK. Triggers: (1) persistence schema/migration — a new `customWorkoutTemplates` Dexie
table; (2) canonical domain semantic change — `WorkoutTemplateId` widens from the fixed
`"A" | "B" | "C"` union to `string`. Owner ruling obtained: YES (see Mission — tonight's explicit
delegation of execution authority for exactly this kind of routine-within-authorized-scope
implementation decision, following the same SavedMeal/CustomExercise schema-addition precedent
already shipped twice this session).

## Authorized scope

- **Domain**: widen `WorkoutTemplateId` (`src/domain/workout/types.ts`) from `"A"|"B"|"C"` to
  `string`. `WORKOUT_TEMPLATES`/`WORKOUT_TEMPLATE_ORDER`'s own fixed A/B/C content is NOT
  modified — still the same locked three templates, same exercises, same doc-comment authority.
  New file `src/domain/workout/customTemplate.ts`: `CustomWorkoutTemplate` (directly-mutable
  preset, same treatment as `SavedMeal`/`CustomExercise` — id/name/exercises/createdAt/
  archivedAt, `exercises: ExercisePrescription[]` reusing the existing type).
- **Persistence**: `src/persistence/db.ts` v10 adds `customWorkoutTemplates` table, purely
  additive. `src/persistence/workoutTemplateValidation.ts` — zod schemas mirroring
  `exerciseValidation.ts`'s pattern (Input/Modify/full-record split), requiring at least one
  exercise.
- **Application**:
  - `src/application/customTemplateCommands.ts` — `createCustomTemplate`, `updateCustomTemplate`,
    `archiveCustomTemplate` (mirrors `exerciseLibraryCommands.ts` exactly).
  - `src/application/customTemplateQueries.ts` — `getCustomTemplates`, and the resolver layer
    that lets the rest of the app treat a custom template's id like a built-in one without ever
    touching `WORKOUT_TEMPLATES`'s own fixed dictionary: `resolveTemplateDefinition(templateId)`
    (checks built-in first, falls back to the custom table), `resolveTemplateExercises(templateId,
    sessionType)` (applies the existing REDUCED first-two-exercises rule generically, whether
    built-in or custom), `resolvePrescription(templateId, sessionType, exerciseId)`.
  - `src/application/trainQueries.ts`: `getProgressionSuggestion` calls `resolvePrescription`
    instead of the domain's synchronous `getPrescription` directly (same behavior for built-in
    ids; now also resolves custom ones). `getCurrentProgressionSuggestions`'s doc-commented scope
    ("the static, already-locked STANDARD catalog") is extended to also cover the operator's own
    custom templates — informational Performance Brief display only, not a rotation/priority
    change.
- **UI**:
  - New MORE sub-screen `src/ui/screens/more/CustomTemplateScreen.tsx` (reachable the same way
    Exercise Library/Decision Journal are): name a template, select 1+ exercises from the
    operator's saved `CustomExercise` library (set count per exercise, default 3; rep range/
    equipment/increment pulled from the saved exercise), save/list/archive.
  - `src/ui/screens/more/MoreScreen.tsx`: one new `CollapsibleRow` entry + view branch, same
    pattern as `EXERCISE LIBRARY`.
  - `src/ui/screens/train/TrainScreen.tsx`: the pre-session template picker gains the operator's
    active custom templates as additional chips (labeled by name, not just an id) alongside
    A/B/C. The local `exercisesFor` helper (and the local `TEMPLATE_ORDER` constant, replaced by
    the domain's `WORKOUT_TEMPLATE_ORDER` plus loaded custom template ids) resolve exercises from
    either source. Custom templates loaded once via `refresh()` into existing component state,
    no new async data-loading pattern introduced.

## Explicit exclusions

- **Custom templates are manually selectable only — never part of the Engine's auto-suggested
  A → B → C → A rotation.** `engine/trainSuggestion.ts` (`suggestNextTemplate`), and
  `application/trainQueries.ts`'s `suggestTemplateForNextWorkout`/`getLastAdvancingTemplate`, are
  **not touched** — the locked rotation-advancement doctrine and its extensive existing test
  coverage are entirely unaffected. This is a deliberate scope boundary, not an oversight: the
  operator picks a custom template the same way they already override the suggested A/B/C choice
  today: an explicit tap, never a system suggestion.
- No change to `WORKOUT_TEMPLATES`'s own fixed A/B/C definitions or their exercises/rep ranges.
- No change to `engine/progression.ts` — it already takes no template concept at all.
- No editing of a custom template's exercise slots' rep range/equipment inline in the template
  builder — those come from the operator's saved `CustomExercise` record; editing that record
  (via the existing Exercise Library screen) is the way to change them. Keeps this Drop's builder
  UI to one clear job: assembling exercises into a named template, not re-editing exercise facts.
- No recovery-session interaction — RECOVERY sessions have no exercises and are unaffected.
- No calorie/macro/nutrition work (tracked separately).

## Relevant authority / references

- Direct owner ruling in chat, 2026-09-12 ("get the workout stuff going") and 2026-09-14/15
  ("in charge... tonight," delegating execution authority for exactly this class of decision).
- `docs/agent/drops/TRAIN-CREATE-001.md` — this Drop's own stated purpose as the thing
  TRAIN-CREATE-001 was built to feed.
- `docs/UX_DECISIONS.md`'s WORKOUT LIBRARY entry (TRAIN-CREATE-001) — same "own the UX, don't
  touch the locked A/B/C system" boundary, now extended one layer further (assembly, not just
  cataloging).
- `src/domain/workout/types.ts`'s own doc comment ("Fixed machine-oriented templates... locked
  word for word") — preserved verbatim; this Drop adds a parallel, clearly-separate custom path,
  never edits that dictionary.

## Required invariants

- `WORKOUT_TEMPLATES`'s three built-in definitions are byte-for-byte unchanged.
- `engine/trainSuggestion.ts` and its exported functions' signatures/behavior are unchanged; its
  existing test suite (`tests/engine/trainSuggestion.test.ts`) passes with zero modification.
- `db.ts` v10 is purely additive — every prior version's `.stores()` block stays byte-for-byte
  unchanged.
- A custom template requires at least one exercise; `resolveTemplateExercises` never throws for
  an unknown/archived template id — returns an empty array (callers already treat "no exercises"
  as a valid, renderable state, matching RECOVERY's existing `[]` case).
- Architecture boundaries hold: no engine file gains an application/persistence import; the new
  UI screen only calls application/domain, never Dexie directly.

## Acceptance criteria

- A custom template can be created from 1+ saved exercises, selected in TRAIN's picker, used to
  start a real workout session, log sets against each of its exercises, receive progression
  advisory on repeat use, and complete — proven by a real integration test exercising this full
  path end to end (create template → start workout → log sets → complete → progression advisory
  changes on a second session).
- Archiving a custom template removes it from the picker without breaking any workout session
  already logged against it (same non-destructive precedent as `archiveCustomExercise`/
  `archiveSavedMeal`).
- `tests/engine/trainSuggestion.test.ts` and `tests/integration/trainWorkout.test.ts` pass
  unmodified (or with only additive new cases, never edited existing assertions).
- `npm run verify` passes in full.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite + production build).
Given the HIGH-RISK schema trigger: a backup/restore round-trip test for
`CustomWorkoutTemplate`, same shape as `tests/integration/exerciseLibrary.test.ts`'s own
round-trip block.

## Builder expectations

- Work only in `../beyond-worktrees/claude-train-create-002` on branch
  `claude/train-create-002-custom-templates`, cut from the baseline above.
- Implement exactly the authorized scope; touching `trainSuggestion.ts`'s rotation logic or
  `WORKOUT_TEMPLATES`'s fixed content is a STOP condition, not a judgment call.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm `WORKOUT_TEMPLATES`'s three definitions are genuinely untouched
  (diff them explicitly), confirm `trainSuggestion.ts` has zero diff, confirm the new Dexie
  version is purely additive, confirm the end-to-end integration test genuinely exercises a
  custom template through a real workout session rather than only testing CRUD in isolation.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close TRAIN-CREATE-002 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to fold custom templates into the auto-suggested rotation, or to modify
  `WORKOUT_TEMPLATES`'s fixed content, is a scope-expansion STOP — escalate rather than guess.
- If widening `WorkoutTemplateId` to `string` surfaces a real type-safety regression beyond what
  this contract already anticipated (e.g. a call site that silently accepts a nonsense id where
  it previously couldn't), stop and add a runtime guard rather than loosen further.
