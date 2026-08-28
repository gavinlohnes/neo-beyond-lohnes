---
id: TODAY-002
baseline: 7985c83f5b79fd1753d4fc5d1c1d2d9b5b9e953d
risk_tier: ARCHITECTURAL
---

# TODAY-002 // OPERATIONAL ATTENTION

## Mission

Make TODAY one coherent operational surface organized as ORIENT → OPERATE → SUPPORT, with
presentation authority determined by unresolved operational relevance. Evolve the existing
pure attention policy so active consequential operations own the field, earned attention stays
scarce, context orients, and resolved information progressively recedes.

## Approved baseline

`origin/master` at `7985c83f5b79fd1753d4fc5d1c1d2d9b5b9e953d`, verified via
`git fetch origin master && git rev-parse origin/master` after CONTINUITY-001 closure.

## Risk classification

ARCHITECTURAL. The Drop changes TODAY's presentation precedence and composition around Engine
recommendations and active workflows while explicitly preserving Engine and domain authority.
The direct owner authorization for TODAY-002 supplies the required ruling. No persistence,
schema, dependency, correction-model, or backup boundary is authorized.

## Authorized scope

- Evolve `src/ui/screens/today/attentionPolicy.ts` as the single deterministic presentation-
  weight policy for TODAY.
- Wire existing canonical/query state into that policy without moving ownership.
- Restructure TODAY presentation only as needed to express ORIENT → OPERATE → SUPPORT.
- Use existing semantic UI primitives and visual grammar; narrowly adjust shared styling only
  if unavoidable.
- Add focused pure-policy, integration, browser, accessibility, responsive, and continuity
  regression tests for the authorized behavior.

## Explicit exclusions

- No Engine recommendation changes, new scoring, persisted attention state, schema, migration,
  dependency, command, event, correction, or canonical lifecycle changes.
- No Situation Assembly, generalized ActiveOperation framework, universal operational context,
  second recommendation authority, or speculative shared infrastructure.
- No redesign of TRAIN or unrelated screens, notification infrastructure, or broad visual pass.

## Relevant authority / references

- Direct owner authorization: `BEYOND TODAY-002 // OPERATIONAL ATTENTION` (2026-08-28).
- `AGENTS.md` and `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`.
- `docs/agent/BEYOND_DELIVERY_PROTOCOL.md` and `.claude/skills/beyond-drop/SKILL.md`.
- `docs/UX_DECISIONS.md`, relevant `.claude/rules/**`, and current TODAY/Engine/query tests.
- CONTINUITY-001 integrated at `ff03f50f4bb8b20d4e56e3010de91e5e065c99c9`.

## Required invariants

- Attention policy decides presentation weight only; canonical truth, command validity, Engine
  recommendations, persistence, and lifecycle semantics retain their existing owners.
- Active operations outrank passive information where authority permits; a recommendation
  already fulfilled by the active operation becomes subordinate without being rewritten.
- Unrelated consequential guidance is not silently hidden; incompatible foreground operations
  surface conflict/degraded truth rather than arbitrary selection.
- At most two earned ATTENTION signals; NO_ACTION_REQUIRED may be genuinely quiet.
- CurrentOperationalContext stays bounded and read-only; CONTINUITY-001 workout resume and
  END DAY protections remain intact.
- Local-first behavior, accessibility, 320px operation, and successful TRAIN progressive
  completion do not regress.

## Acceptance criteria

- Policy decisions are deterministic and directly tested for active workout/recommendation/
  commitment, RESET/SHIFT DOWN conflict, END DAY, post-shift, Minimum Day, check-in, Capture,
  pending outcome, no-day, and calm-state combinations.
- TODAY visibly follows ORIENT → OPERATE → SUPPORT without competing primary instructions for
  the same operational need.
- Resolving the dominant item promotes the correct next unresolved state and progressively
  quiets the surface.
- Reload continuity, context race/failure safety, keyboard/accessibility behavior, and 320px
  layout are directly verified.
- No excluded authority, behavior, dependency, persistence, schema, or unrelated screen changes.

## Required verification

- Focused attention-policy and TODAY integration/browser tests, including the adversarial
  combinations and sequential FIELD simulation in the owner contract.
- Real Chromium inspection at 320px and a normal phone viewport.
- `npm run check:risk 7985c83f5b79fd1753d4fc5d1c1d2d9b5b9e953d`.
- `npm run verify` (architecture boundaries, full tests, typecheck, production build, and PWA).
- Final diff and clean-worktree inspection before PR creation.

## Builder expectations

- Build only on `today-002-operational-attention-activation` in this isolated worktree from the
  exact approved baseline.
- Implement exactly the authorized scope and stop for any consequential authority ambiguity.
- Run required verification, open one PR, persist the exact-head Builder handoff, then stop.
- Never self-review, self-approve, merge, or begin another Drop.

## Reviewer expectations

- A separate read-only session reviews the exact final head from this contract and diff.
- Persist a durable exact-head-bound PR review/comment containing verdict, findings or explicit
  none, and merge readiness.
- Never modify, merge, or expand scope.

## Integrator expectations

- A separate explicitly authorized session integrates only after green required checks and
  independent review evidence with all findings dispositioned.
- Never bypass protections; after merge, mechanically close TODAY-002 with the verified
  integration SHA and preserve this contract permanently.

## Stop / escalation conditions

- Stop if remote baseline changes, another Drop is active, or repository/factory access fails.
- Stop if correct precedence requires a new product ruling, Engine/recommendation semantic
  change, canonical lifecycle change, persistence/schema work, new architectural primitive,
  dependency, or behavior outside this contract.
- Stop if CONTINUITY-001 protections or existing ownership cannot be preserved.
