---
id: AUTOPILOT-CANDIDATE-DISPATCH-002
baseline: AT_ACTIVATION
risk_tier: ARCHITECTURAL
---

# AUTOPILOT-CANDIDATE-DISPATCH-002 // CANDIDATE DISPATCH

## Mission

Add deterministic, fail-closed Factory candidate reconciliation and a machine-readable dispatch
envelope so a fresh session can identify or reuse the one legal candidate for a campaign Drop
without owner-relayed PR/branch state or false claims that the repository launches agents.

## Approved baseline

The exact build baseline is the freshly fetched protected `origin/master` SHA at activation. This
contract is preregistered on protected master and uses `AT_ACTIVATION` to avoid predicting its own
protected integration SHA.

## Risk classification

ARCHITECTURAL. This changes Factory state and authority-adjacent candidate semantics, but crosses
no product, persistence, dependency, security, privacy, provider, or user-data boundary.

## Authorized scope

- Canonical candidate identity keyed by campaign, Drop, activation baseline, and protected contract identity.
- Deterministic reconciliation of valid, equivalent, obsolete, divergent, duplicate, stale, and ambiguous candidates.
- Machine-readable dispatch envelopes naming only the next legal role/action and required inputs.
- Narrow GitHub adaptation and hermetic adversarial tests for the deterministic core.
- Factory-only documentation, type declarations, package commands, Drop activation, and routing.

## Explicit exclusions

- No agent/session launch, autonomous merge, closure, next-Drop activation, or approval transfer.
- No hardcoded PR numbers, title-based equivalence, campaign mutation, or authorization changes.
- No product, Engine, domain, persistence, user-data, UI, provider, AI authority, paid service,
  privacy/security boundary, destructive migration, dependency, or unrelated repository change.
- No implementation of AUTOPILOT-LIFECYCLE-002 or any later campaign Drop.

## Relevant authority / references

- Active `FACTORY-PHASE-2-R1` manifest and digest
  `989dab17dca4544d52f3d9d70f04ad27ff5ef9175ea3cba30d8ecbedf524db8c`.
- Owner architectural ruling requiring protected-master contract preregistration, 2026-09-01.
- `docs/agent/FACTORY_AUTOPILOT.md`, `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, and
  `.claude/skills/beyond-drop/SKILL.md`.

## Required invariants

- Candidate identity never depends on title text, a pasted PR number, ACTIVE_DROP routing, or Builder-controlled contract content.
- Baseline, protected contract identity, campaign revision/digest, and Drop identity must match exactly.
- Conflicting or insufficient evidence fails closed; reviews never carry to a replacement head.
- Obsolete candidate evidence is preserved when closure is requested; no PR is deleted.
- Dispatch states describe work for an external role-capable session and never claim to launch it.
- Builder, Reviewer, Integrator, protected-master, exact-head CI, and independent-review boundaries remain intact.

## Acceptance criteria

- Pure reconciliation covers none, reusable, equivalent, obsolete, divergent, duplicate, stale, malformed, and ambiguous candidate sets deterministically.
- Scope/baseline/protected-contract/campaign mismatch refuses dispatch with a stable code.
- A valid existing candidate is reused idempotently; replacement never inherits reviews.
- Dispatch output is versioned JSON and states the legal role/action, candidate identity, evidence source, and external-session requirement.
- Hermetic tests prove every named state and no product path changes.

## Required verification

- Focused Factory tests for candidate dispatch and protected contract identity.
- `npm run check:risk -- <activation-baseline>`
- `npm run verify`
- `git diff --check`
- Exact-head PR Verification on the canonical bot-authored PR.

## Builder expectations

- Work only on this Drop from the activation baseline and remain within Factory paths.
- Use the dedicated Builder App for the canonical review candidate.
- Persist exact-head Builder evidence, then stop without reviewing, approving, merging, closing, or beginning a later Drop.

## Reviewer expectations

- Independently review candidate identity, reconciliation ambiguity, stale/replacement evidence,
  dispatch honesty, and protected campaign/scope binding from this contract and the exact diff.
- Persist a formal exact-head review; never merge or broaden scope.

## Integrator expectations

- Reverify campaign authority, exact head, CI, independent formal approval, mergeability, and candidate identity before normal protected integration.
- Do not use direct protected-master closure; AUTOPILOT-LIFECYCLE-002 owns its replacement.

## Stop / escalation conditions

- Stop on campaign pause/revoke/escalation, activation-baseline or digest drift, conflicting active Drop,
  protected-contract mismatch, inability to preserve evidence, need for broader App permissions, or any excluded boundary.
