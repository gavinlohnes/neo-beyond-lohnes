---
id: CONTINUITY-001
baseline: 4445fbcd8a62b95e5aa0c40fd249d65e800bebfa
risk_tier: ARCHITECTURAL
---

# CONTINUITY-001 // STAY WITH THE OPERATOR

## Mission

Preserve unresolved foreground operations and return the operator to them, while progressively
subordinating resolved setup state. Repair the FIELD-OPS-001 active-workout/END DAY continuity
defect and deliver the bounded TRAIN re-entry, Work Context, SHIFT DOWN, and Minimum Day clarity
outcomes directly authorized by Gavin in the CONTINUITY-001 brief.

## Approved baseline

`origin/master` at `4445fbcd8a62b95e5aa0c40fd249d65e800bebfa`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-08-27.

## Risk classification

ARCHITECTURAL. The Drop intentionally strengthens application-command behavior around END DAY and
workout ownership and coordinates that behavior with App/TRAIN/TODAY presentation. It does not
change Engine arbitration, domain types, persistence schema, backup/restore, correction chains,
dependencies, or protected fixtures. Drive needed: NO; the direct owner contract, repository
Decision Register, and current implementation establish the bounded behavior.

## Authorized scope

- Prevent explicit or fallback day closure from silently stranding an ACTIVE workout.
- Preserve and resume the canonical ACTIVE workout across refresh/re-entry and major-tab navigation
  without creating a duplicate or changing workout history.
- Progressively subordinate resolved Work Context setup and promote MARK WORK ENDED while valid.
- Let an unstarted SHIFT DOWN picker collapse without mutating canonical state; keep ACTIVE SHIFT
  DOWN visible and consequential.
- Clarify that Minimum Day completion belongs to the active BeyondDay, including across a calendar
  boundary, without changing its lifecycle.
- Add focused application, integration, browser, accessibility, and narrow-width regression tests.

## Explicit exclusions

- No TODAY, TRAIN, BODY, MORE, or primary-navigation redesign.
- No new workflow/ActiveOperation/navigation framework or shared global store.
- No new canonical lifecycle, event, command, recommendation, or Capture semantics beyond the
  explicitly authorized continuity guard.
- No workout auto-completion, auto-cancellation, day migration, history rewrite, or new global
  operation record.
- No schema, migration, backup-format, restore, protected-fixture, dependency, Engine, or domain
  type changes.
- No calendar-midnight reset of Minimum Day and no adjacent cleanup.

## Relevant authority / references

- Gavin's direct CONTINUITY-001 authorization (2026-08-27).
- `AGENTS.md` BUILDER MODE and `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`.
- `docs/UX_DECISIONS.md`: explicit BeyondDay lifecycle; interrupted RESET/SHIFT DOWN resumability;
  active workout reload survival; operator authority; history preservation.
- `.claude/skills/beyond-drop/SKILL.md` §§1, 3, 8, and 9.
- FIELD-OPS-001 findings as adjudicated in the owner contract.

## Required invariants

- An ACTIVE workout remains canonical history on its original BeyondDay until the operator
  completes, saves partial, or stops it through existing commands.
- END DAY never auto-completes, auto-cancels, migrates, or conceals an ACTIVE workout.
- At most one app-created ACTIVE workout exists; resume never creates a duplicate.
- Completed-set data and TRAIN current/next-work hierarchy remain intact.
- Work Context, SHIFT DOWN, Minimum Day, BeyondDay, Engine, event, persistence, and operator-authority
  meanings remain unchanged except for the authorized END DAY safety guard.
- No color-only state, hidden consequential state, inaccessible controls, or 320px overflow.

## Acceptance criteria

- Direct `endDay` and fallback `startDay` cannot strand an ACTIVE workout and provide an actionable
  failure; after the workout is resolved, day closure succeeds normally.
- App re-entry with a trustworthy ACTIVE workout opens TRAIN and restores exact completed-set/current
  position state; repeated resume/start attempts do not create another workout.
- Navigation away and back preserves the active workout; completion after resume uses existing
  canonical commands and history.
- WORKING TODAY = YES subordinates the answered setup and makes MARK WORK ENDED the clear next action;
  OFF and ended states remain truthful and compact.
- An unstarted SHIFT DOWN picker can collapse and reopen without writing events; an ACTIVE session
  cannot be collapsed away.
- Minimum Day copy explicitly identifies active-BeyondDay ownership; calendar time does not reset it,
  while a real BeyondDay transition still produces the existing new-day state.
- Existing TRAIN progressive completion behavior and protected successful patterns remain green.

## Required verification

- Focused integration and browser tests for workout/day lifecycle, TRAIN/App re-entry, TODAY Work
  Context/SHIFT DOWN/Minimum Day, accessibility, and 320px behavior.
- `npm run check:architecture`.
- `npm run check:risk 4445fbcd8a62b95e5aa0c40fd249d65e800bebfa`.
- `npm run verify` (architecture, full Vitest suite, typecheck, production build/PWA generation).
- Compatibility/protected-fixture integrity through the unchanged full suite and clean-diff review.
- Direct real-Chromium acceptance at 320px and representative phone widths for touched workflows.

## Builder expectations

- Work only in the isolated `continuity-001-stay-with-operator` branch/worktree cut from the exact
  baseline above.
- Implement exactly the authorized scope and stop for genuine authority or architecture expansion.
- Run all required verification, open one PR, persist the Builder handoff, then stop.
- Never self-review, self-approve, self-merge, or begin another Drop.

## Reviewer expectations

- Use a separate read-only session and review the approved contract plus exact final diff.
- Adversarially test workout/day ownership, duplicate prevention, recovery, stale state, progressive
  resolution, and Minimum Day lifecycle preservation.
- Persist exact-head-bound verdict, findings (or explicit none), and merge-readiness on the PR.
- Never merge or self-authorize scope changes.

## Integrator expectations

- Use a separate explicitly authorized session; merge only the exact approved, reviewed, green head.
- Do not bypass required checks.
- After merge, close CONTINUITY-001 with the authoritative merge SHA; never rewrite this contract.

## Stop / escalation conditions

- Current authority requires auto-completing, auto-cancelling, or migrating an ACTIVE workout.
- Correctness requires schema/persistence, domain type, Engine, event semantic, dependency, protected
  fixture, broad navigation, or generalized workflow architecture changes.
- Existing canonical state cannot be preserved, or a consequential product choice remains unresolved
  after applying the direct owner contract and locked repository doctrine.
