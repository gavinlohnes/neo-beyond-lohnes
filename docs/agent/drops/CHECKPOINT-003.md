---
id: CHECKPOINT-003
baseline: e066a24214a41eb49a84e18af52247527fbc171c
risk_tier: ROUTINE
---

# CHECKPOINT-003 // Refresh current operational checkpoint

## Mission

Replace `docs/agent/CURRENT_CHECKPOINT.md` wholesale with a compact, current handoff snapshot
derived directly from repository truth at the verified post-JOURNAL-002 baseline. The existing
checkpoint stops at PR #55 and materially misstates shipped capabilities, schema, dependencies,
test coverage, and next work; this Drop repairs that recovery surface without changing product,
runtime, or factory behavior.

## Approved baseline

`origin/master` at `e066a24214a41eb49a84e18af52247527fbc171c`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-09-15. The baseline is the
JOURNAL-002 closure commit; `docs/agent/ACTIVE_DROP.md` was directly confirmed as
`id: JOURNAL-002`, `status: CLOSED` before this Drop began.

## Risk classification

ROUTINE. This is a documentation-only replacement plus the repository-native Drop contract and
activation pointer. None of the Architectural or High-Risk semantic triggers apply: no runtime,
Engine, domain, persistence, dependency, fixture, workflow, or product behavior changes.

## Authorized scope

- Replace `docs/agent/CURRENT_CHECKPOINT.md` in full with a current, directly inspected snapshot.
- Record this permanent Drop Contract at `docs/agent/drops/CHECKPOINT-003.md`.
- Activate `docs/agent/ACTIVE_DROP.md` through `scripts/factory-drop.mjs` and update its PR
  routing field when the PR exists.
- Record the owner-routed Obligations arbitration question as unresolved; do not decide it.

## Explicit exclusions

- No source, test, package, lockfile, workflow, doctrine, Decision Register, README, or
  Capability Map edits.
- No product implementation, including no Engine/recommendation arbitration change.
- No decision or implementation concerning Obligations as a Recommendation kind.
- No reprioritization or authorization of any later Drop; sequencing remains with the owner.
- No attempt to merge, review, integrate, or close this Builder session's own PR.

## Relevant authority / references

- Direct owner assignment in this session: refresh the stale checkpoint as its own small Drop,
  verify current repository state by direct inspection, and ship through the normal pipeline.
- Direct owner instruction in this session: route the Obligations arbitration question to Gavin
  and do not build or resolve it.
- `AGENTS.md` and `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` for Builder scope, isolated-worktree,
  role-separation, no-self-merge, and escalation requirements.
- `.claude/skills/beyond-drop/SKILL.md` for Routine verification and Factory activation/handoff.
- Current source, tests, package metadata, Git history, Drop contracts, `ACTIVE_DROP.md`, and
  `docs/agent/CAPABILITY_MAP.md` as inspected evidence—not the stale checkpoint's assertions.

## Required invariants

- The checkpoint is an operational snapshot, not a new source of product or factory authority.
- Every concrete current-state claim is traceable to repository truth at the approved baseline.
- Shipped work is not listed as pending; unresolved or external state is labeled honestly.
- The deterministic five-kind Engine remains final in code, and no recommendation-priority
  choice is implied by the wording of this documentation.
- Authorized-but-unbuilt work is not treated as sequenced or currently activated; a fresh
  session must reconfirm with Gavin before starting any of it.

## Acceptance criteria

- `CURRENT_CHECKPOINT.md` names the exact verified baseline and the closed JOURNAL-002 pointer.
- It replaces the stale PR #55 product/schema/dependency/testing facts with current facts derived
  from the tree and Git history through PR #94.
- It accurately distinguishes built capabilities from remaining candidates and exclusions.
- Its NEXT OPERATION section asks Gavin to choose sequencing and explicitly surfaces the
  Obligations arbitration question without answering it.
- `git diff --check` and `npm run check:risk origin/master` pass.
- `npm run verify` passes before the PR is opened.

## Required verification

Standard Routine gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && build`), plus `git diff --check` and
`npm run check:risk origin/master`. No additional compatibility surface applies.

## Builder expectations

- Work only in `C:\Users\Gavin\beyond-worktrees\codex-checkpoint-003` on
  `codex/checkpoint-003-refresh`, cut from the exact baseline above.
- Implement only the authorized documentation scope and run the required verification.
- Open the PR and persist a concise Builder handoff there, then stop—never self-review,
  self-merge, integrate, close this Drop, or begin another Drop.

## Reviewer expectations

- A separate session from the Builder reviews the exact PR head from this contract plus the
  final diff only.
- Verify factual checkpoint claims against current repository truth and flag any stale,
  ambiguous, or authority-expanding statement with file/line evidence.
- Persist a formal exact-head-bound GitHub `APPROVED` review from an eligible collaborator
  distinct from the PR author; never merge or self-authorize a scope change.

## Integrator expectations

- A separate, explicitly authorized session—never this Builder or the Reviewer—merges only the
  approved, exact-head-reviewed, green PR without bypassing required checks.
- After merge, run `node scripts/factory-drop.mjs close CHECKPOINT-003 --integration-sha
  <merge-commit-sha>`, commit and push the closure, then confirm the closure commit's own deploy
  check completes successfully before reporting the Drop done.

## Stop / escalation conditions

- The verified baseline, active-Drop state, or current repository facts conflict with this
  contract.
- A factual checkpoint claim cannot be established from repository/Git/GitHub evidence.
- The refresh would require changing another authoritative document rather than reporting its
  present state honestly.
- Any attempt to answer or build the Obligations recommendation-arbitration decision, or to
  choose the sequence of later work without Gavin's confirmation.
