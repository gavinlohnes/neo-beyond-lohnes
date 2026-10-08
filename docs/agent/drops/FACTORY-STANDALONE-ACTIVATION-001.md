---
id: FACTORY-STANDALONE-ACTIVATION-001
baseline: 25d5c4c330c88c78f42e14edef58893c5935c3b0
risk_tier: ARCHITECTURAL
---

# FACTORY-STANDALONE-ACTIVATION-001 // Protected standalone activation

## Mission

Allow an explicitly owner-preregistered standalone Drop to use the existing protected-contract
`AT_ACTIVATION` trust boundary without pretending it belongs to a campaign. Owner selected this
policy path on 2026-10-07 to unblock VCC-001 while preserving fail-closed authorization.

## Approved baseline

`origin/master` at `25d5c4c330c88c78f42e14edef58893c5935c3b0`.

## Risk classification

ARCHITECTURAL: this changes Factory's authorization and activation boundary, without changing
product, Engine, domain, persistence, or application behavior.

## Authorized scope

- Accept `baseline: AT_ACTIVATION` for a standalone contract only when the complete contract
  already exists identically on freshly fetched protected `origin/master`.
- Bind the actual protected-master SHA into `ACTIVE_DROP.md` during activation.
- Fail closed when the contract exists only in Builder HEAD or differs from protected master.
- Add adversarial Factory tests and update the directly governing Factory/Drop documentation.

## Explicit exclusions

- No product/UI/Engine/domain/persistence behavior, campaign authorization evidence, active
  campaign pointer, GitHub protection, dependency, or VCC implementation change.

## Relevant authority / references

- Direct owner choice of option 2 on 2026-10-07.
- `.claude/skills/beyond-drop/SKILL.md` and `docs/agent/FACTORY_AUTOPILOT.md` protected-contract
  trust boundary.

## Required invariants

- Builder-controlled files never establish or redefine preregistered authority.
- Exact-SHA standalone contracts remain fully compatible and unchanged.
- Campaign contracts retain their existing membership/risk checks.
- Activation records the actual fetched master SHA, never the sentinel.

## Acceptance criteria

- A protected standalone AT_ACTIVATION contract initializes and records the exact current master.
- A Builder-only standalone AT_ACTIVATION contract fails with `TRUSTED_CONTRACT_REQUIRED`.
- A mutated Builder copy fails with `BUILDER_CONTRACT_MUTATION`.
- Existing campaign and exact-SHA Factory tests remain green.

## Required verification

- `npx vitest run tests/factory/factoryDrop.test.ts`
- `npm run check:architecture`
- `npm run typecheck`
- `npm run build`
- `npm run check:risk -- 25d5c4c330c88c78f42e14edef58893c5935c3b0`
- `git diff --check`

## Builder expectations

- Codex implements only this policy change on `codex/factory-standalone-activation-001`, opens a
  PR, records the handoff, and stops without self-reviewing or merging.

## Reviewer expectations

- Independently verify the exact-head trust boundary, adversarial failures, backward compatibility,
  and that no product scope entered the diff.

## Integrator expectations

- Merge only after independent exact-head review, green CI, and owner approval; close this Drop
  before VCC activation.

## Stop / escalation conditions

Stop if the change would weaken protected-master authority, accept Builder-only contracts, alter
campaign evidence, or require product/runtime dependencies.
