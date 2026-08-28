---
id: TODAY-003
baseline: b72ab9a6914e1409b6b5c0ec28aad24974f01ff3
risk_tier: ROUTINE
---

# TODAY-003 // CONTINUITY RECONCILIATION

## Mission

Repair the three owner-authorized TODAY defects reproduced in direct 320px browser simulation: keep an active workout visible and resumable after same-session navigation to TODAY, prevent manual check-in expansion from duplicating the same immediate action, and make a resolved check-in progressively recede. Preserve existing Engine, workout, check-in, persistence, and lifecycle authority.

## Approved baseline

`origin/master` at `b72ab9a6914e1409b6b5c0ec28aad24974f01ff3`, verified via `git fetch origin master && git rev-parse origin/master` on 2026-08-28.

## Risk classification

ROUTINE. This is a UI presentation/resumability repair using the existing `getActiveWorkoutSession` application query and existing TODAY primitives. None of the Architectural or High-Risk triggers apply: no Engine, domain, command/event, persistence, schema, backup, fixture, dependency, or cross-layer contract changes are authorized.

## Authorized scope

- Evolve the existing TODAY attention policy to recognize an already-canonical active workout as a foreground operation.
- Query active workout truth through the existing application boundary when TODAY mounts or refreshes.
- Present a clear resume route to TRAIN without creating or mutating a workout.
- Reconcile manual check-in presentation state so expansion does not duplicate `ALL GOOD` and successful submission collapses resolved input.
- Add focused pure-policy and browser regression tests for the reproduced paths, conflict handling, reload continuity, accessibility, and 320px overflow.
- Record and activate this Drop through the repository factory mechanism.

## Explicit exclusions

- No Engine or recommendation changes.
- No command, event, workout lifecycle, BeyondDay, or check-in semantic changes.
- No persistence, schema, backup, restore, fixture, or dependency changes.
- No TRAIN redesign, broad TODAY redesign, navigation redesign, new global operation framework, or persisted presentation state.
- No unrelated cleanup or shared-style restyling.

## Relevant authority / references

- Gavin's direct 2026-08-28 instruction, “Do it,” following the reproduced TODAY continuity defects.
- `AGENTS.md` Builder and SERIAL-ONLY discipline.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`.
- `docs/agent/BEYOND_DELIVERY_PROTOCOL.md`.
- `.claude/skills/beyond-drop/SKILL.md`.
- `docs/UX_DECISIONS.md` TRAIN requirement that an active workout survive reload.
- TODAY-002's existing `src/ui/screens/today/attentionPolicy.ts` and CONTINUITY-001's existing root re-entry restoration.

## Required invariants

- Canonical active workout truth remains owned by application queries and workout commands.
- TODAY decides presentation weight only and cannot start, complete, cancel, or otherwise mutate a workout through the resume affordance.
- Engine recommendation truth and priority remain unchanged.
- Existing reload restoration and END DAY active-workout protection remain intact.
- Check-in commands and recorded values remain unchanged.
- Conflicting foreground operations are explicit rather than silently arbitrated.
- `ATTENTION_MAX` remains two and no new persisted source of truth is introduced.

## Acceptance criteria

- Start workout, navigate to TODAY: TODAY visibly identifies the active workout as the dominant operation and exposes one resume action.
- Repeated resume attempts return to the same canonical session and never create a duplicate workout.
- Reload with an active workout continues to restore TRAIN at the existing session.
- Active workout combined with RESET or SHIFT DOWN produces explicit degraded/conflict presentation; no active operation is concealed.
- Opening manual check-in while the missing-check-in signal is active produces only one `ALL GOOD` action.
- Successful quick or manual check-in closes the expanded form and presents the compact recorded state.
- Existing RESET/SHIFT DOWN/recommendation placement and scarce attention behavior remain covered.
- At 320px there is no horizontal overflow and controls remain keyboard/screen-reader operable.

## Required verification

- Focused policy tests: `npx vitest run tests/ui/attentionPolicy.test.ts`.
- Focused TODAY/App browser tests covering the repaired workflows.
- `npm run check:risk b72ab9a6914e1409b6b5c0ec28aad24974f01ff3`.
- `npm run verify`.
- Direct Chromium FIELD simulation at 320px and a normal phone width for active-workout navigation/resume, check-in expansion/resolution, and operation conflict.
- `git diff --check` and final clean-diff inspection.

## Builder expectations

- Work only in the isolated `today-003-continuity-reconciliation` branch/worktree cut from the exact baseline above.
- Implement exactly the authorized scope and stop for any boundary expansion.
- Run required verification, commit, push, open one PR, persist a concise Builder handoff there, then stop.
- Never self-review or self-merge.

## Reviewer expectations

- Review in a separate session from the Builder using this contract and the exact final diff.
- Adversarially verify workout truth/resume, operation conflicts, check-in state reconciliation, and preserved Engine/command/persistence boundaries.
- Persist exact-head-bound review evidence on the PR with verdict, findings or explicit none, and merge readiness.
- Never merge or authorize scope expansion.

## Integrator expectations

- Operate in a separate explicitly authorized session after green CI and required durable review evidence.
- Never bypass required checks.
- After merge, close TODAY-003 through `node scripts/factory-drop.mjs close TODAY-003 --integration-sha <merge-commit-sha>` without altering this historical contract.

## Stop / escalation conditions

- Stop if remote master moves from the approved baseline before activation.
- Stop if another Drop or builder owns the TODAY SERIAL-ONLY seam.
- Stop if repair requires changing Engine priority, command/event semantics, persistence/schema, workout lifecycle, navigation architecture, or a new shared architectural primitive.
- Stop on any conflict with higher repository authority or inability to preserve the existing canonical workout/check-in behavior.
