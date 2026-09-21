---
id: TODAY-QUICKACTIONS-001
baseline: b643af556ba934c234d5e2c4506b0b74ef518a7e
risk_tier: ROUTINE
---

# TODAY-QUICKACTIONS-001 // NIGHT-SHIFT QUICK ACTIONS

## Mission

Three small, independently-shippable interaction fixes, scoped and ranked directly against "what
Gavin would actually touch on a night shift within a week of it shipping" (direct owner
authorization, this session, 2026-09-20/21), picked from a 3-item shortlist he approved in full:

1. A TRAIN-side entry point for the PLANNED_WORK_SET declaration (PLANNED-WORK-001 shipped it
   TODAY-only; TRAIN is where he actually decides to train).
2. A one-tap resolve action on the shift-protection PROTECT advisory note (FOUNDATION-1B shipped
   it read-only; this adds the same quick-add water action MinimumDaySection already offers, plus
   a shortcut into Minimum Day for protein).
3. `PlannedWorkCard` collapses once answered, matching `WorkContextCard`'s existing settled-state
   pattern, so an answered declaration doesn't keep permanent full-card weight on TODAY or TRAIN.

## Approved baseline

`origin/master` at `b643af556ba934c234d5e2c4506b0b74ef518a7e`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-09-21 (PLANNED-WORK-001's own
merge commit).

## Risk classification

ROUTINE. All three items are UI-only, reusing existing application-layer commands/queries
verbatim (`setPlannedWork`, `getPlannedWorkDeclaration`, `logWater`) with zero new commands,
zero new domain/event types, and zero Engine/domain semantic changes. Confirmed no
Architectural/High-Risk trigger applies per `.claude/skills/beyond-drop/SKILL.md` §1 ("UI-only...
that don't cross the above → Routine").

## Authorized scope

- `src/ui/screens/train/TrainScreen.tsx`: render the existing `PlannedWorkCard` (imported from
  `ui/screens/today/PlannedWorkCard.tsx`, not duplicated) in the pre-session view, wired to the
  same `setPlannedWork`/`getPlannedWorkDeclaration` functions TODAY already uses.
- `src/ui/screens/today/AdvisorySection.tsx`: when a note's `sourceModule` is `"shiftProtection"`,
  read its existing `unmetItem` basis entries and render matching quick actions — the same
  `WATER_QUICK_ADD_OZ` one-tap amounts `MinimumDaySection` already offers for HYDRATE, and an
  "open Minimum Day" shortcut for PROTEIN (no fabricated gram default — NO_FAKE_PRECISION).
- `src/ui/screens/today/TodayScreen.tsx`: pass the existing `handleMinimumDayLogWater` handler
  and a `setMinimumDayOpen(true)` callback into `AdvisorySection`.
- `src/ui/screens/today/PlannedWorkCard.tsx`: add `open`/`setOpen` props and a collapsed
  `CollapsibleRow` summary once `declaration !== undefined`, mirroring `WorkContextCard.tsx`'s
  existing settled-state pattern exactly (open-state owned by each caller, same lifting
  discipline). Both TodayScreen and TrainScreen own their own `plannedWorkOpen` state.
- Tests: browser coverage for the TRAIN toggle, the PROTECT quick actions, and the collapse
  behavior.

## Explicit exclusions

- No new command, event type, domain field, or Engine input — every action here calls an
  already-existing, already-tested application-layer function.
- No fabricated protein quick-add amount — PROTEIN's action opens Minimum Day's real input,
  it never guesses a gram value.
- No change to `engine/shiftProtection.ts`'s or `engine/advisory.ts`'s composition logic — the UI
  reads `AdvisoryNote.basis` exactly as already produced, nothing new is stamped onto it.
- No change to WorkContextCard, MinimumDaySection, or any other existing card beyond the two
  small prop additions to AdvisorySection/TodayScreen named above.
- No Phase 12 (multi-agent), no new persona, no purely visual/design-only change with no
  behavioral effect — all three items add or remove a real interaction.

## Relevant authority / references

- Direct owner authorization for this session's "NEXT DROP SCOPING" exercise (2026-09-20/21):
  three candidates proposed, ranked by night-shift real-world touch, capped at 3, design-only and
  Phase 12/persona work explicitly excluded by the owner's own brief; owner picked all three in
  the stated order (1, 2, 3).
- `docs/agent/drops/PLANNED-WORK-001.md` / `FOUNDATION-1B.md` — the two prior Drops this one
  extends, both merged.
- `docs/UX_DECISIONS.md`'s `PLANNED-WORK-001` and `FOUNDATION-1B` sections — the locked doctrine
  (explicit-only declaration, NO_FAKE_PRECISION, AdvisoryNote's non-Recommendation contract) this
  Drop must not weaken.

## Required invariants

- `AdvisoryNote` remains informational-only — the new quick actions call real BODY-logging
  commands directly, but the note itself still carries no `priority`, is never marked
  accepted/declined, and never becomes a `Recommendation`.
- `PLANNED_WORK_SET` remains the only source of `hasActivePlannedWork` — TRAIN's new entry point
  calls the exact same `setPlannedWork` command TODAY already uses, not a parallel path.
- `evaluate.ts`, `engine/shiftProtection.ts`, `engine/continuity.ts`, and all other engine/domain
  code stay byte-for-byte unchanged.
- Existing full test suite (including FOUNDATION-1B's and PLANNED-WORK-001's own integration
  suites) stays green.

## Acceptance criteria

- Opening TRAIN directly (without visiting TODAY first) and declaring "TRAIN TODAY" makes TODAY's
  next check-in resolve `EXECUTE_PLANNED_WORK` (proves the same real gap PLANNED-WORK-001 fixed
  for TODAY is now also fixed for the TRAIN-first path).
- Triggering the PROTECT advisory note (pre-shift, unmet hydrate) and tapping a quick-add amount
  logs water and the note's HYDRATE item clears without leaving TODAY.
- Declaring planned work (either answer), then reloading, shows `PlannedWorkCard` as a collapsed
  one-line row, not a full card; tapping it re-expands to the full toggle.
- `npm run verify` passes (architecture, full suite, production build).

## Required verification

Standard Routine gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && npm run build`), plus `git diff --check` and
`npm run check:risk b643af556ba934c234d5e2c4506b0b74ef518a7e`.

## Builder expectations

- Work only on `claude/today-quickactions-001-night-shift`, cut from the exact baseline above.
- Implement exactly the authorized scope; treat any temptation to touch Engine/domain code, or to
  fabricate a quick-add amount for protein, as a STOP condition already resolved against.
- Run the required verification, commit, push, open a PR, and stop — do not merge, do not open a
  further Drop.

## Reviewer expectations

- A separate session reviews this contract plus the final diff.
- Checks that no Engine/domain file changed, that every new action calls an existing
  application-layer function (no new command/event), and that the full existing suite still
  passes unchanged.
- Persists exact-head-bound review evidence; never merges or expands scope unilaterally.

## Integrator expectations

- A separate, explicitly authorized session merges only an approved, green PR.
- No admin-bypass of any required check.
- After merge, close TODAY-QUICKACTIONS-001 via `node scripts/factory-drop.mjs close
  TODAY-QUICKACTIONS-001 --integration-sha <merge-commit-sha>`; this contract file is never
  rewritten by closure.

## Stop / escalation conditions

- Any temptation to add a new command/event/domain field for any of the three items — already
  resolved against; a genuine new need here stops and returns to the owner.
- Any temptation to fabricate a default protein quick-add amount.
- `origin/master` differs from the approved baseline at any point verification is re-run.
- Another Drop becomes ACTIVE concurrently.
