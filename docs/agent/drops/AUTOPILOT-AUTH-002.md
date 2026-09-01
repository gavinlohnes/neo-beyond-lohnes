---
id: AUTOPILOT-AUTH-002
baseline: fcd2a23b4e2190819ae9db6255b58a3f18e8542e
risk_tier: ARCHITECTURAL
---

# AUTOPILOT-AUTH-002 // CAMPAIGN AUTHORIZATION V2

This is the canonical repository-native Drop Contract for the Phase 2 bootstrap authorized by
the owner on 2026-09-01. It establishes durable, exact-revision-bound campaign authority
validation only; it does not implement autonomous dispatch, integration, closure, or progression.

## Mission

Replace self-asserted campaign approval booleans with deterministic, fail-closed validation of
typed GitHub campaign-authorization evidence bound to an exact campaign revision and digest.
Support bounded scope, ordered Drops, work classes, risk and boundary constraints, escalation,
expiry, PAUSE, RESUME, and terminal REVOKE semantics for future controller use.

## Approved baseline

`origin/master` at `fcd2a23b4e2190819ae9db6255b58a3f18e8542e`, independently verified via
`git fetch origin master && git rev-parse origin/master` before this branch was created.

## Risk classification

ARCHITECTURAL. This changes the semantic authority contract consumed by the Factory controller
and the boundary between repository declarations and durable GitHub Owner evidence. It does not
cross a persistence, protected-fixture, dependency, product, or runtime schema boundary.

## Authorized scope

- Add schema-v2 campaign authorization fields and a typed authorization-evidence model.
- Add pure deterministic validation for exact revision/digest, Owner identity, formal approval,
  trusted-master ancestry, scope, work class, risk ceiling, prohibited boundaries, escalation,
  expiry, PAUSE/RESUME, terminal REVOKE, synthetic-evidence refusal, and High-Risk rulings.
- Keep live GitHub adaptation narrow and separate from pure validation where practical.
- Add hermetic adversarial tests for every case named in the owner's authorization.
- Update Factory doctrine, campaign templates, type declarations, and status output needed to
  document and expose the new authority-validation contract.
- Preserve the owner-provided Phase 2 sequence in repository documentation without implementing
  any later Drop.

## Explicit exclusions

- No automatic merge, Drop closure, subsequent-Drop activation, agent launch, or M1 activation.
- No branch-protection change, Builder App permission expansion, secret handling, workflow-write
  permission, direct-master shortcut, or `pull_request_target` execution.
- No implementation of AUTOPILOT-CANDIDATE-DISPATCH-002, AUTOPILOT-LIFECYCLE-002,
  AUTOPILOT-PROTECTION-002, or DOGFOOD-AUTOPILOT-002.
- No product, Engine, domain, persistence, application, UI, protected-fixture, or dependency change.
- No weakening of independent review, exact-head checks, legacy single-Drop fail-closed behavior,
  or Drop-specific High-Risk Owner rulings.

## Relevant authority / references

- Direct owner ruling `BEYOND FACTORY PHASE 2 // IMPLEMENTATION BOOTSTRAP`, 2026-09-01.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`.
- `.claude/skills/beyond-drop/SKILL.md`, especially risk, verification, and Factory doctrine.
- `docs/agent/FACTORY_AUTOPILOT.md` and the integrated FACTORY-AUTOPILOT-001 baseline.

## Required invariants

- A manifest boolean, prose, label, branch name, comment, silence, or synthetic fixture never
  grants campaign authority.
- Only a domain-separated `CAMPAIGN_AUTHORIZATION` mechanism with a formal Owner APPROVED review
  bound to the exact authorization commit/revision may authorize.
- Active campaign content and digest must exactly match the authorized revision integrated into
  trusted master; changes to authorized scope invalidate authority.
- PAUSE is resumable only for unchanged, still-valid authority with no revocation or escalation.
- REVOKE is terminal for a campaign revision; resumption requires a new revision and fresh grant.
- High-Risk Drops always retain their separate explicit Owner-ruling requirement.
- Builder identity remains Builder-only and cannot self-authorize.
- GitHub/API ambiguity and legacy schema-v1 campaign authority fail closed.

## Acceptance criteria

- Pure validation emits stable machine states/reasons including AUTHORIZED, PAUSED, REVOKED,
  EXPIRED, OWNER_DECISION_REQUIRED, INVALID_AUTHORIZATION, STALE_AUTHORIZATION, SCOPE_MISMATCH,
  RISK_CEILING_EXCEEDED, PROHIBITED_BOUNDARY, and ESCALATION_REQUIRED.
- Typed authorization evidence cannot be confused with ordinary product PR approval.
- Exact authorized revision/digest, trusted-master ancestry, Owner identity, review state/commit,
  candidate Drop scope/risk/boundaries, and lifecycle state are deterministically checked.
- All adversarial cases in the owner authorization have hermetic regression coverage.
- Existing single-Drop status remains compatible, while old self-asserted campaign approval fails
  closed instead of silently gaining broader authority.
- Documentation preserves the remaining Phase 2 Drop order and explicitly states it is not active.

## Required verification

- `npx vitest run tests/factory/factoryAutopilot.test.ts`
- `npm run check:risk -- origin/master`
- `npm run verify`
- PR `PR Verification` must complete successfully on the final exact head.

## Builder expectations

- Work only in the isolated `codex/autopilot-auth-002` branch/worktree cut from the exact baseline.
- Implement only this contract and stop on any excluded or unapproved boundary.
- Persist a concise exact-head Builder handoff on the PR after full verification.
- Open the PR and stop; never self-review, self-merge, or begin a later Phase 2 Drop.

## Reviewer expectations

- Review from this contract and final diff in a separate read-only session.
- Adversarially test authority confusion, stale/digest/scope evidence, lifecycle transitions,
  synthetic evidence, Builder self-authorization, and High-Risk separation.
- Persist exact-head-bound formal review evidence with findings and merge-readiness on the PR.
- Never merge or negotiate a scope expansion with the Builder.

## Integrator expectations

- Operate only in a separately authorized Integrator session after exact-head independent approval
  and green required CI.
- Recheck authorization, head, review, check, mergeability, and protection immediately before merge.
- Use only the normal protected PR method; never bypass protection.
- Perform canonical Factory closure after merge and verify remote master/deployment.

## Stop / escalation conditions

- Stop if implementation requires secrets, broader App/workflow permissions, branch-protection
  changes, untrusted `pull_request_target` code, direct-master integration, or live authorization
  from synthetic evidence.
- Stop on any product, Engine, domain, persistence, application, UI, protected-fixture, dependency,
  or unapproved workflow/security boundary.
- Stop if exact GitHub evidence cannot be represented without ambiguity or if current repository
  authority conflicts with the owner's rulings.
