---
id: FACTORY-003
baseline: 2d3cad34645afed52d43a65b1a4be223cbc7bf77
risk_tier: ARCHITECTURAL
---

# FACTORY-003 // Stale-branch robustness for cross-branch active-Drop detection

This is the canonical, repository-native Drop Contract format — see
`.claude/skills/beyond-drop/SKILL.md` §9 (Development Factory V1) for the full mechanism this
file participates in.

## Mission

Make `scripts/factory-drop.mjs`'s cross-branch `CONFLICTING_ACTIVE_DROP` check robust to this
repository's confirmed master-history discontinuity (`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s
"Historical-branch disposition rule"), without weakening the single-active-Drop safety guarantee.
Eleven historically-merged branches (BODY-UX-001, EMBLEM-001, EMBLEM-002, GLYPH-001,
LAUNCH-VISION-001, LAUNCH-VISION-002, MOTION-001, NUTRITION-003, TRAIN-CREATE-001,
TRAIN-CREATE-002, TYPOGRAPHY-001) currently fail the existing `git merge-base --is-ancestor`
check and falsely report as conflicting, because master's commit graph was reset to a fresh
orphan root (`9230d6e`, "Close BODY-UX-001 (integration 8a5f3ba)") at some point after they
merged. This is a direct owner authorization following a three-round design review (repo-local
audit → GitHub-fallback design → repo-local-sufficiency investigation) that locked the algorithm
below (Design C — Hybrid).

## Approved baseline

`origin/master` at `2d3cad34645afed52d43a65b1a4be223cbc7bf77`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before branching.

## Risk classification

**ARCHITECTURAL.** This changes the algorithm behind the repository's one cross-branch
"at most one active Drop" safety guarantee, and adds a live GitHub-API dependency to a check
that was previously fully local/deterministic (the same class of consideration
`CLAUDE.md`/`docs/agent/BEYOND_ENGINEERING_CONTRACT.md` flag under "a meaningful new runtime
dependency" and "command/event semantic changes"). No `src/engine/**`, `src/persistence/**`,
schema/migration, correction-model, or protected-fixture file is touched, so the HIGH-RISK
triggers do not apply.

## Authorized scope

- `scripts/factory-drop.mjs`: extend `findConflictingActiveDropAcrossBranches` (and thread the
  necessary `async` up through `preflight`, `initActiveDrop`, and the `validate`/`init` branches
  of `main()`) to implement the locked hybrid algorithm:
  1. Preserve the existing `git merge-base --is-ancestor` fast path unchanged.
  2. For a non-ancestor branch that is `status: ACTIVE` with a different `id` than requested
     (today's conflict candidate): compare the branch's own
     `docs/agent/drops/<id>.md` git blob against `origin/master`'s current copy of the same
     path. If absent or mismatched, report the conflict exactly as today — no GitHub call.
  3. If the contract blobs match, attempt GitHub PR corroboration for the PR named in the
     branch's own `ACTIVE_DROP.md` `pr:` field, reusing `scripts/factory-autopilot.mjs`'s
     existing token-discovery (`GH_TOKEN`/`GITHUB_TOKEN` env, else `git credential fill`) and
     `fetch`-based `api()` pattern.
  4. The only new condition that suppresses the conflict: `pr.merged === true` AND
     `pr.head.sha === <this branch's current tip SHA>`.
  5. Every other outcome (no token, no network, non-2xx/API error, unparseable PR reference, PR
     not merged, head SHA mismatch, no contract match) fails closed to today's behavior: report
     the conflict.
  6. When the contract blobs match but GitHub corroboration could not be obtained, enrich the
     conflict message with that diagnostic (does not change the outcome).
- `tests/factory/factoryDrop.test.ts`: hermetic regression coverage for all 10 cases listed in
  Required verification below, via a mock GitHub API reachable at a test-overridable base URL
  (new `FACTORY_DROP_GITHUB_API_BASE` env override, matching the existing
  `FACTORY_DROP_ROOT`/`FACTORY_DROP_EXPECTED_REPO` override style) plus a fixture helper that
  simulates a master-history rewrite (orphan commit via `git commit-tree`, force-pushed to the
  fixture's bare origin).

## Explicit exclusions

- No branch deletion, anywhere, ever — this Drop is detection-only.
- No change to PR #102 or PR #104 or their branches (`copilot/chamfer-utility-builder`,
  `copilot/fix-github-actions-job-failure`).
- No change to `close`'s or `status`'s existing behavior (neither calls the cross-branch check).
- No repo-local signal (contract-blob match, branch metadata, `ACTIVE_DROP.md` content) may ever
  independently clear a branch — GitHub's `merged` + exact `head.sha` remains the sole sufficient
  condition, per the owner's locked mandatory invariant.
- No new npm dependency; no shelling out to `curl` or any other external executable — `fetch`
  only (Node's built-in global, already used by `scripts/factory-autopilot.mjs`).
- No initialization of FOUNDATION-1B or any other product Drop.
- No change to `docs/UX_DECISIONS.md`, product code, or anything outside `scripts/factory-drop.mjs`
  and its tests (a brief, optional doc note in
  `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`/`.claude/skills/beyond-drop/SKILL.md` is in scope
  only if it fits without expanding the diff's actual risk surface).

## Relevant authority / references

- Direct owner design-adjudication chain, this session: repo-local stale-branch audit →
  GitHub-fallback design report → owner-directed repo-local-sufficiency investigation → Design C
  (Hybrid) locked by direct owner decision, with the exact algorithm and required regression
  cases specified verbatim in that authorization.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s "Historical-branch disposition rule" — already
  documents the confirmed pre-history-reset discontinuity this Drop makes the script robust to.
- `.claude/skills/beyond-drop/SKILL.md` §9 (Development Factory V1) — the mechanism this script
  implements; this Drop does not change its contract-format or ACTIVE_DROP semantics, only the
  cross-branch conflict check's evidence sources.
- `scripts/factory-autopilot.mjs`/`scripts/factory-autopilot-core.mjs` — existing, already-shipped
  precedent in this repo for treating GitHub's own PR `merged`/`head.sha` state as canonical
  integration evidence, and for the token-discovery/`fetch` pattern this Drop reuses verbatim.
- The 11 branches audited and independently verified (PR `merged: true`, delivered content
  present on current master) in the prior read-only audit turns of this session.

## Required invariants

- **Mandatory (owner-stated): a branch that was historically merged and later received ANY new
  commit must NOT be cleared by the historical-merge fallback.** GitHub's merged-PR `head.sha`
  versus the branch's current tip SHA is the sole authority for this.
- The existing ancestor-of-master fast path is unchanged in behavior and never calls GitHub.
- A genuinely unmerged/open branch is never cleared under any corroboration outcome, including
  when GitHub is fully reachable (an open PR reliably returns `merged: false`).
- Any corroboration failure (missing token, network/API error, unparseable PR, absent/mismatched
  contract) degrades to exactly today's shipped behavior — never a new hard-failure code, never a
  silent clear.
- `close` and `status` behavior is unchanged.

## Acceptance criteria

- All 10 regression cases in Required verification exist as passing tests using a hermetic mock
  GitHub API — no real network call in the test suite.
- `npm run verify` passes (architecture check + full test suite, node + browser projects +
  production build).
- Manually re-running the (non-mutating) `node scripts/factory-drop.mjs validate <test-id>
  --baseline <master SHA>` against this repository's real state, with a real `GH_TOKEN`/credential
  available, clears at least one of the 11 known false-positive branches without reporting it —
  demonstrated in the Builder handoff, not merely asserted.

## Required verification

`npm run verify` (architecture-boundary check + full vitest suite, node + browser projects +
production build), plus the 10 named regression cases:
1. normal ancestor historical branch → skipped without any GitHub call
2. genuine unmerged ACTIVE branch → conflict
3. rewrite-orphaned + contract match + merged PR + exact head SHA → safely skipped
4. rewrite-orphaned + contract match + `merged: false` → conflict
5. rewrite-orphaned + contract match + merged PR + head SHA mismatch → conflict
6. matching contract + no token → conflict
7. matching contract + API/network failure → conflict
8. malformed/unparseable PR reference → conflict
9. contract absent/mismatch → conflict, no GitHub call attempted
10. existing second-active-Drop protection remains intact (regression, not new behavior)

## Builder expectations

- Work only in an isolated branch cut from the exact baseline above.
- Implement exactly the authorized scope and the locked algorithm; treat any deviation from the
  algorithm the owner specified as a STOP condition, not a judgment call — note any unavoidable
  deviation explicitly in the handoff rather than silently substituting.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review, never begin another Drop
  (including FOUNDATION-1B).
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default against the mandatory invariant specifically: try to construct a
  scenario where a branch with new post-merge commits gets cleared, and confirm the test suite
  actually proves it can't.
- Every finding evidence-backed, tagged CONFIRMED or PLAUSIBLE.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review.
- Never merges, never self-authorizes a scope change.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- No admin-bypass of any required check, ever.
- After merge: retire this Drop's `ACTIVE_DROP` record via `node scripts/factory-drop.mjs close
  FACTORY-003 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to let repo-local evidence (contract-blob match alone) clear a branch without
  GitHub corroboration — stop; this is the exact thing the owner's mandatory invariant forbids.
- Any temptation to widen scope to branch deletion, FOUNDATION-1B, or PR #102/#104 — stop; out of
  scope by explicit owner instruction.
- A genuine conflict between this contract and higher repository authority — escalate to the
  owner directly.
