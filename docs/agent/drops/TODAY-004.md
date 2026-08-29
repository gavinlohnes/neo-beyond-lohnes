---
id: TODAY-004
baseline: dba4ba649066d49231c72244a4d8c1e33d7760d3
risk_tier: ROUTINE
---

# TODAY-004 // STATUS STRIP DEPLOYMENT REPAIR

## Mission

Diagnose and correct the single browser regression reported by the post-TODAY-003 deployment at
`tests/browser/TodayScreen.test.tsx:393`, determining from repository behavior whether it is a
real status-strip regression or a stale/fragile assertion, and restore green verification and
deployment readiness without reopening TODAY-003.

## Approved baseline

`origin/master` at `dba4ba649066d49231c72244a4d8c1e33d7760d3`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-08-28.

## Risk classification

ROUTINE. The authorized correction is limited to the existing TODAY status-strip presentation
or its focused browser assertion. None of the Architectural or High-Risk triggers apply: no
Engine, domain, command/event, persistence, schema, backup, fixture, dependency, or cross-layer
contract change is authorized.

## Authorized scope

- Reproduce and diagnose the exact `tests/browser/TodayScreen.test.tsx:393` failure from the
  failed deployment run.
- Determine whether the failure represents incorrect status-strip behavior or a stale/fragile
  browser assertion.
- Make the smallest correction to the existing TODAY status-strip implementation or focused
  browser test justified by that diagnosis.
- Record and activate this separate corrective Drop through the repository Factory mechanism.

## Explicit exclusions

- Do not reopen, rewrite, or otherwise alter `docs/agent/drops/TODAY-003.md` or TODAY-003's
  recorded integration history.
- No broader TODAY redesign, status-strip redesign, or unrelated test cleanup.
- No Engine, domain, command/event, persistence, schema, backup, fixture, dependency, or CI
  workflow changes.
- Do not suppress a real behavior regression by weakening coverage.

## Relevant authority / references

- Gavin's direct 2026-08-28 authorization of `TODAY-004 // STATUS STRIP DEPLOYMENT REPAIR` from
  baseline `dba4ba649066d49231c72244a4d8c1e33d7760d3`.
- Failed deployment run `https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/33204748434`,
  which records the exact assertion failure at `tests/browser/TodayScreen.test.tsx:393`.
- `AGENTS.md`, `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`,
  `docs/agent/BEYOND_DELIVERY_PROTOCOL.md`, and `.claude/skills/beyond-drop/SKILL.md`.
- Existing TODAY status-strip doctrine and tests in `docs/UX_DECISIONS.md`,
  `src/ui/screens/today/TodayScreen.tsx`, and `tests/browser/TodayScreen.test.tsx`.

## Required invariants

- Status-strip severity must continue to reflect canonical current capacity truth.
- GREEN, YELLOW, RED, and UNKNOWN presentation behavior must remain explicit and covered.
- TODAY-003's closed historical contract and integration record remain intact.
- No product authority, Engine behavior, persistence truth, or application boundary changes.
- The correction must address the diagnosed cause rather than merely making one assertion pass.

## Acceptance criteria

- The baseline failure is reproduced or its intermittent mechanism is independently demonstrated.
- Repository evidence identifies the failure as either real behavior regression or stale/fragile
  assertion.
- The smallest justified correction passes the exact affected test and adjacent status-strip
  severity cases.
- `npm run verify` passes from the final clean branch state.
- The final diff remains within the declared corrective and Factory-record footprint.

## Required verification

- Focused reproduction of the named case in `tests/browser/TodayScreen.test.tsx`.
- Focused run of the adjacent GREEN, YELLOW, RED, and UNKNOWN status-strip browser cases.
- `npm run check:risk dba4ba649066d49231c72244a4d8c1e33d7760d3`.
- `npm run verify`.
- `git diff --check` and final clean-diff inspection.

## Builder expectations

- Work only on `codex/today-004-status-strip-deployment-repair` in the isolated Builder worktree
  cut from the exact baseline above.
- Diagnose before editing and implement exactly the authorized scope.
- Run required verification, commit, push, open one PR, and persist a concise Builder handoff on
  the PR before stopping.
- Never self-review or self-merge.

## Reviewer expectations

- Review in a separate session from the Builder using this contract and the exact final diff.
- Verify that the diagnosis is evidence-backed and the correction preserves all status-strip
  severity behavior rather than weakening the regression check.
- Persist exact-head-bound review evidence on the PR with verdict, findings or explicit none,
  and merge readiness.
- Never merge or authorize scope expansion.

## Integrator expectations

- Operate in a separate explicitly authorized session after green required CI and durable review
  evidence.
- Never bypass required checks.
- After merge, retire TODAY-004 through `node scripts/factory-drop.mjs close TODAY-004
  --integration-sha <merge-commit-sha>` without altering either historical Drop contract.

## Stop / escalation conditions

- Stop if `origin/master` differs from the approved baseline at activation.
- Stop if another active Drop or Builder owns the TODAY SERIAL-ONLY seam.
- Stop if the correction requires changing product doctrine, Engine behavior, persistence,
  application contracts, dependencies, or CI workflows.
- Stop on any conflict with higher repository authority or inability to distinguish product
  behavior from test fragility with reproducible evidence.
