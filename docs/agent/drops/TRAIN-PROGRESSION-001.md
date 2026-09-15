---
id: TRAIN-PROGRESSION-001
baseline: 916f3a9d9cf701d1e184c03ae5ae0607af4fe473
risk_tier: ROUTINE
---

# TRAIN-PROGRESSION-001 // Real per-equipment progression increments

## Mission

Replace TRAIN's flat, hardcoded `incrementLbs: 5` placeholder — used for every exercise
regardless of equipment, since the app's inception — with a real, equipment-derived increment.
`CustomExercise`/`LibraryExercise` already carry a real `equipment` field (and, for Barbell,
`muscleGroup` further distinguishes upper- vs. lower-body lifts) that was going unused for this
purpose. Directly authorized by the owner tonight as item 1 of a four-item execution list
("Fix TRAIN's flat 5lb progression increment — derive a real per-exercise increment... instead
of one hardcoded default for everything"), itself following an explicit "brutally honest" gap
assessment naming this as a real, present product weakness: once custom exercises exist with
wildly different appropriate increments (a barbell squat vs. a dumbbell curl), a flat number
quietly stops being real coaching and starts being a generic rule wearing a coaching costume.

## Approved baseline

`origin/master` at `916f3a9d9cf701d1e184c03ae5ae0607af4fe473`, verified via
`git fetch origin master && git rev-parse origin/master` (JOURNAL-001's own closure commit —
the current master HEAD at Drop launch).

## Risk classification

ROUTINE. This touches `src/domain/workout/types.ts` (a `src/domain/**` file), which per
`.claude/skills/beyond-drop/SKILL.md` §1 prompts a close look, not an automatic escalation:
"touching the file without changing what a type means is NOT this tier." `ExercisePrescription`'s
shape is completely unchanged (still exactly `{exerciseId, name, sets, repRangeLow, repRangeHigh,
incrementLbs: number}`) — only how the `incrementLbs` *value* is computed changes, and the
domain file's own pre-existing doc comment explicitly invited this exact fix ("structured so it's
easy to configure per exercise once real equipment data exists... not a claimed-locked value").
Not architectural: `engine/progression.ts`'s `evaluateProgression` rule (INCREASE/HOLD/REDUCE
logic, locked per `.claude/rules/engine.md`) is completely untouched — this Drop changes what
data feeds that already-locked rule, never the rule itself. No new dependency, no schema change,
no persistence change.

## Authorized scope

- `src/domain/workout/types.ts`: new exported pure function `deriveIncrementLbs(equipment:
  string, muscleGroup?: string): number` — Machine → 10lb, Cable → 5lb, Dumbbell → 5lb, Barbell
  → 10lb for Legs/Glutes else 5lb, anything else (including Bodyweight) → the existing
  `DEFAULT_INCREMENT_LBS` fallback (now exported, still 5). Every exercise in the fixed A/B/C
  `WORKOUT_TEMPLATES` gets its `incrementLbs` computed via this function from its real equipment
  (cross-checked against `EXERCISE_LIBRARY`'s own classification of the same movement by name,
  not invented) instead of the flat literal.
- `src/ui/screens/more/CustomTemplateScreen.tsx`: `handleCreate`'s per-exercise
  `ExercisePrescription` construction calls `deriveIncrementLbs(source.equipment,
  source.muscleGroup)` (`source` being the `CustomExercise` the operator selected) instead of a
  locally-duplicated flat placeholder constant, which is removed.
- Tests: `tests/domain/workoutTypes.test.ts` (new) — unit coverage for `deriveIncrementLbs` and
  a regression proving `WORKOUT_TEMPLATES` is no longer flat; `tests/integration/
  trainProgression.test.ts` (one pre-existing assertion updated: `machine-chest-press`'s real
  suggested next weight is now 135+10=145, not 135+5=140, since Machine equipment now carries a
  real 10lb increment); `tests/browser/CustomTemplateScreen.test.tsx` (new case proving the real
  derivation flows through the actual screen component's create flow, not just the pure function
  in isolation).

## Explicit exclusions

- `engine/progression.ts`'s `evaluateProgression` rule itself — completely untouched, per
  `.claude/rules/engine.md`'s lock on this module.
- `WORKOUT_TEMPLATES`' exercise composition, names, `sets`, and rep ranges — these remain the
  locked, word-for-word content per the Decision Register; only `incrementLbs` values change,
  exactly the field the domain file's own comment already carved out as not part of that lock.
- No redesign of bodyweight-movement progression (a genuinely different axis — reps/added
  resistance, not weight) — Bodyweight equipment falls back to the existing flat default, an
  honestly-labeled limitation, not a claimed fix, for that one equipment type.
- No change to `CustomExercise`/`LibraryExercise`'s own shape — `equipment`/`muscleGroup` already
  existed; this Drop only starts reading them for a purpose they weren't previously used for.
- No UI change beyond the one construction site above — no new field, no new screen, no visible
  copy change (the operator already sees `incrementLbs` reflected only via the existing +/- step
  size on TRAIN's own exercise cards, which already read `ex.incrementLbs`, unchanged).

## Relevant authority / references

- Direct owner authorization tonight: approval of a four-item execution list with this as item 1,
  following an explicit "brutally honest" product-gap assessment in this conversation.
- `src/domain/workout/types.ts`'s own pre-existing `ExercisePrescription` doc comment: explicitly
  labels the flat 5lb value "an explicit implementation placeholder... not a claimed-locked
  value," inviting exactly this correction.
- `docs/UX_DECISIONS.md`'s TRAIN section: no locked decision constrains `incrementLbs`'s value —
  only rotation-advancement and progression-advisory-is-advisory-only are locked there.
- `docs/HARVEST_READINESS_REPORT.md` (historical, Section 2 Capability Inventory): flagged this
  exact gap originally — "Increment-per-exercise is a documented placeholder (flat 5lb default)
  rather than real per-equipment data — a real gap, but an honestly-labeled one."

## Required invariants

- `ExercisePrescription`'s shape is unchanged.
- `engine/progression.ts`'s rule logic is byte-for-byte unchanged — verified by not touching that
  file at all in this diff.
- `deriveIncrementLbs` is pure, deterministic, zero I/O (plain string/optional-string in, number
  out) — no Dexie, no application-layer import, consistent with living in `src/domain/**`.
- Every one of the 12 built-in `WORKOUT_TEMPLATES` exercises' `incrementLbs` value matches what
  `EXERCISE_LIBRARY`'s own equipment classification for that same movement would produce (not an
  independently-invented value per exercise).

## Acceptance criteria

- `npx tsc -b` passes with zero errors.
- `npm run check:architecture` passes.
- `npx vitest run --project node` passes, including the new/extended tests above.
- `npx vitest run --project browser` passes (all 25 files / 346 tests), including the new
  `CustomTemplateScreen.test.tsx` case proving the real derivation through the actual screen.
- `npm run build` succeeds.
- `WORKOUT_TEMPLATES`'s 12 built-in exercises no longer all carry the identical `incrementLbs`
  value — proven by `tests/domain/workoutTypes.test.ts`'s "not every exercise carries the same
  increment" regression test.
- Creating a custom template from a Machine-equipment `CustomExercise` through the real
  `CustomTemplateScreen` UI produces a stored `ExercisePrescription` with `incrementLbs: 10`, not
  the old flat `5` — proven by the new browser test.

## Required verification

Standard gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && build`). No additional High-Risk compatibility surface
applies.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR
and stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing
from this contract and the final diff only, adversarial by default, every finding evidence-
backed and tagged CONFIRMED/PLAUSIBLE, persist exact-head-bound review evidence as a durable PR
comment or review, never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved,
reviewed, green PR; no admin-bypass; closes `ACTIVE_DROP.md` via
`node scripts/factory-drop.mjs close TRAIN-PROGRESSION-001 --integration-sha <merge-sha>` after
merge.

## Stop / escalation conditions

- Any temptation to also change `evaluateProgression`'s rule logic, `WORKOUT_TEMPLATES`'
  exercise composition/sets/rep-ranges, or add a new domain field — stop and escalate rather
  than expand scope.
- Any discovery that a specific built-in exercise's real-world equipment classification is
  actually ambiguous or wrong (not matching `EXERCISE_LIBRARY`'s own classification) — stop and
  ask rather than guess.
