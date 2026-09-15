---
id: TODAY-R01
baseline: 24dfb3c589f11e874dbea9a11a13b958404e979f
risk_tier: ROUTINE
---

# TODAY-R01 // START DAY refresh adopts the new day's authoritative state

## Mission

Fix the TODAY-specific defect where `TodayScreen.tsx` can keep rendering prior-day UI state after
START DAY creates a new active day in the same mounted screen. The Drop is limited to proving the
current defect from repository truth, applying the smallest correct TODAY-screen fix, and adding
focused regression coverage so TODAY always adopts the newly created active day's authoritative
state without regressing existing START DAY behavior or LAUNCH-VISION's one-shot power-on sweep.

## Approved baseline

`origin/master` at `24dfb3c589f11e874dbea9a11a13b958404e979f`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. This Drop is confined to TODAY UI/application-consumption behavior and focused browser
tests. None of the Architectural or High-Risk semantic triggers apply: no engine/domain meaning
change, no persistence/schema/backup/dependency/protected-fixture change, and no cross-layer
boundary change.

## Authorized scope

- Investigate and prove the current TODAY START DAY stale-state defect from repository truth.
- Update `src/ui/screens/today/TodayScreen.tsx` with the smallest correct fix so START DAY adopts
  the new active day's authoritative state in the same mounted screen.
- Add or update focused regression coverage in TODAY tests proving prior-day UI state cannot bleed
  into the newly started day, the newly created active day is what TODAY renders, existing START
  DAY behavior remains intact, and LAUNCH-VISION's one-shot START DAY power-on behavior remains
  intact.
- Update Drop machinery (`docs/agent/ACTIVE_DROP.md`) only through the repository's factory
  initialization flow for this Drop.

## Explicit exclusions

- No TODAY-R02 work.
- No refactor of unrelated TODAY code.
- No engine behavior, recommendation priority, or command/event semantic change.
- No schema/migration, correction-model, backup/restore, or protected-fixture changes.
- No dependency changes.
- No TODAY/TRAIN/BODY/MORE information-architecture change.
- No Mission/Obligation semantics change.
- No LAUNCH-VISION scope expansion beyond preserving the already-locked START DAY one-shot behavior.
- No feelings/journal work.
- No self-review, self-merge, or Factory closure by the Builder.

## Relevant authority / references

- Direct owner instruction in chat, 2026-09-15, explicitly assigning Codex as Builder for
  TODAY-R01 only and bounding scope to the START DAY stale-state defect plus regression coverage.
- `CLAUDE.md` — authority order, architecture-layer rules, and escalation boundaries.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` — baseline/worktree discipline, no scope invention,
  no self-merge, serialized TODAY seam.
- `.claude/skills/beyond-drop/SKILL.md` — Routine risk classification, Factory procedure, and
  `npm run verify` local final gate.
- `docs/UX_DECISIONS.md` — LAUNCH-VISION-003 locks START DAY's one-shot `.today-field--boot`
  behavior and keeps it presentation-only.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md` — TODAY remains the smallest useful current-state surface;
  it must not present stale truth as current.

## Required invariants

- TODAY must render only state truthfully belonging to the current active `BeyondDay`.
- START DAY's one-shot `.today-field--boot` power-on sweep still fires when a day is explicitly
  started from the pre-day state and does not replay later within that same day.
- No engine, domain, persistence, or recommendation semantics change.
- Architecture boundaries remain unchanged (`src/ui/**` consuming `src/application/**` only).
- The fix stays within the serialized TODAY seam (`src/ui/screens/today/**`) plus its focused
  regression tests.

## Acceptance criteria

1. A focused regression test proves that after ending a prior day and starting a new one in the
   same mounted TODAY screen, prior-day UI state does not remain visible as if it belonged to the
   new day.
2. A focused regression test proves the newly created active day is the day TODAY renders after
   START DAY.
3. Existing START DAY behavior remains covered and passing.
4. LAUNCH-VISION's START DAY one-shot power-on sweep coverage remains passing unchanged or with
   only minimal, scope-faithful adjustment.
5. `npm run verify` passes on this Drop's branch.

## Required verification

- Focused TODAY browser regression tests covering the defect and START DAY / LAUNCH-VISION
  invariants.
- `npm run verify`
- `npm run check:risk origin/master`

## Builder expectations

- Work only in `/home/runner/work/neo-beyond-lohnes/neo-beyond-lohnes` on branch
  `copilot/today-r01-build-drop`, cut from the baseline above.
- Implement exactly the authorized scope; if the smallest correct fix would require a forbidden
  scope expansion, stop and escalate.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review, never begin another Drop.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Confirm the fix truly addresses stale prior-day START DAY state, preserves existing START DAY
  and LAUNCH-VISION behavior, and does not expand TODAY scope beyond the named defect.
- Every finding evidence-backed with file:line citations and a reproducible failure scenario or
  doctrine/process violation.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merge only an approved, reviewed (if required), green PR.
- After merge: close `TODAY-R01` via `node scripts/factory-drop.mjs close TODAY-R01
  --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Repository truth shows the defect cannot be fixed inside TODAY UI/application-consumption code
  alone.
- The smallest correct fix would require any excluded engine/recommendation/schema/dependency/
  protected-fixture/LAUNCH-VISION-expansion work.
- A genuine conflict appears between this contract and higher repository authority.
- Factory validation or initialization reports an active-drop or baseline conflict that cannot be
  resolved inside normal Drop procedure.
