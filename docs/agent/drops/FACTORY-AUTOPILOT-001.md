---
id: FACTORY-AUTOPILOT-001
baseline: 6ddc3c895492274564afe8b4d094c5ccd7778e88
risk_tier: ARCHITECTURAL
---

# FACTORY-AUTOPILOT-001 // OWNER WORK REDUCTION

## Mission

Extend the repository-native Factory so an owner-approved campaign can move between bounded
Drops without the owner relaying Git, GitHub, CI, review, merge, closure, or next-action facts.
Deterministic mechanics become machine-readable; independent AI judgment and genuine owner
decisions remain explicit, separate gates.

## Approved baseline

Freshly fetched `origin/master` at `6ddc3c895492274564afe8b4d094c5ccd7778e88`.

## Risk classification

ARCHITECTURAL. This changes Factory state semantics and integration gating, not product behavior.
It preserves exact-head review, required CI, role separation, protected master, and fail-closed
operation. Drive needed: NO.

## Authorized scope

- Add one small, zero-dependency campaign manifest format and an example manifest for the future
  `M1 // DECISION & OUTCOME MEMORY + OPERATIONAL REVIEW` campaign. The manifest authorizes
  readiness/discovery only; it never authorizes implementation without an owner-approved campaign.
- Extend repo-native Node Factory tooling to derive compact JSON status and the next legal action
  from repository, campaign, Git, PR, CI, and exact-head review evidence supplied through an
  isolated GitHub-state boundary.
- Add hermetic state-machine and Factory tests for readiness, blocking, stale/malformed state,
  review/CI/head binding, escalation, closure, and single-Drop compatibility.
- Document the deterministic / AI / owner judgment boundary, escalation codes, campaign recovery,
  and the before/after owner-work metric.
- Update existing Factory navigation, package scripts, and PR verification only where required to
  make the new mechanism discoverable and mechanically enforced.
- Factory activation and PR-routing artifacts required by current doctrine.

## Explicit exclusions

- No implementation of M1 or any product capability.
- No Engine, domain, application, persistence, schema, backup/restore, correction, fixture,
  provider, AI-product, or TODAY/TRAIN/BODY/MORE behavior change.
- No server, daemon, queue, database, generic agent framework, SaaS, backend, or new dependency.
- No weakening of protected master, required CI, exact-head approval, Builder/Reviewer/Integrator
  separation, independent review, serial-only seams, data safeguards, or deterministic authority.
- No automatic self-review, self-merge, or owner-free scope expansion.

## Relevant authority / references

- Direct owner authorization for `FACTORY-AUTOPILOT-001 // OWNER WORK REDUCTION`.
- `AGENTS.md`, `CLAUDE.md`, `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`,
  `docs/agent/BEYOND_DELIVERY_PROTOCOL.md`, `.claude/skills/beyond-drop/SKILL.md`.
- Current `scripts/factory-drop.mjs`, Factory tests, CI workflows, and GitHub branch protection.

## Required invariants

- Persist authorization; derive observation. Live facts are never copied into durable manifests.
- Every transition fails closed on missing, malformed, stale, contradictory, or exact-head-mismatched
  evidence.
- Deterministic mechanics never substitute for independent architectural/semantic review.
- Owner escalation is limited to explicit product/doctrine/safety/cost/authority/scope conditions.
- Campaign next-Drop discovery grants readiness only; Builder assignment and implementation
  authorization remain explicit.
- Existing single-Drop commands and historical Drop records remain compatible.

## Acceptance criteria

1. A closed prior Drop identifies the correct next authorized campaign Drop.
2. An ACTIVE Drop blocks conflicting activation.
3. Failed verification cannot advance.
4. Missing required independent review cannot advance.
5. A PR head change after approval invalidates approval.
6. Exact-head mismatch fails closed.
7. An owner-escalation condition refuses autonomous progression with a stable code.
8. Malformed or stale campaign state fails closed.
9. A fresh session can recover campaign, active Drop, and next legal action without relayed prose.
10. The existing single-Drop workflow remains compatible or has an explicit safe migration.
11. No product behavior changes.
12. No existing safety gate is weakened.
13. Before/after owner handoffs and remaining residual Factory friction are documented.

## Required verification

- Hermetic focused Factory/campaign tests, including deliberately broken transition fixtures.
- `npm run check:risk 6ddc3c895492274564afe8b4d094c5ccd7778e88`.
- `npm run verify`.
- `git diff --check` and explicit changed-path review proving product code is untouched.
- Open one PR, confirm exact-head PR Verification, and persist an exact-head Builder handoff.

## Builder expectations

- Codex works only in `codex/factory-autopilot-001-owner-work-reduction`, implements the bounded
  Factory architecture, verifies it, opens one PR, persists the exact final head, and stops.
- The Builder does not review, approve, merge, close, or begin M1.

## Reviewer expectations

- A separate independent Reviewer adversarially reviews the exact PR head, deterministic state
  machine, fail-closed behavior, campaign authorization boundary, compatibility, and all integrity
  gates; persists exact-head verdict/findings/merge-readiness evidence; never merges.

## Integrator expectations

- A separately authorized Integrator merges only the exact approved, green head through normal
  protection, verifies ancestry/deployment, and canonically closes FACTORY-AUTOPILOT-001.

## Stop / escalation conditions

- Stop on baseline drift, another live Drop, malformed Factory state, or inability to preserve an
  existing gate.
- Stop before any product/data boundary change, material scope expansion, recurring external cost,
  destructive migration, privacy/security authority change, or new provider/AI authority.
- Stop if continuous campaigns would require a server, daemon, database, or dependency rather than
  the authorized small repo-native extension.
