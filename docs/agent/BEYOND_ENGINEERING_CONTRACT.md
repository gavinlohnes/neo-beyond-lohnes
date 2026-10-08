# BEYOND Engineering Contract (shared, tool-neutral)

Read by every qualified Builder and Reviewer through `AGENTS.md` (which `CLAUDE.md` imports).
This is the correctness-critical subset of engineering invariants, not a replacement for product
doctrine, `docs/UX_DECISIONS.md`, or `.claude/rules/*`. Development procedure is governed only by
[`DEV-FLOW-002.md`](DEV-FLOW-002.md); this contract preserves the engineering safeguards.

## Authority order

1. Direct owner decision.
2. BEYOND Product Constitution / Operator Doctrine.
3. Canonical Spec + locked Decision Register entries (docs/UX_DECISIONS.md).
4. The current objective's approved brief.
5. Current repository implementation truth.
6. .claude/rules/* path-scoped detail.

## Doctrine load-bearing for code correctness

- INFORM → INTERPRET → RECOMMEND → USER DECIDES.
- Deterministic Engine authority for primary Recommendation behavior — never bypassed, never a
  second recommendation engine built elsewhere.
- History and correction truth are never silently erased — corrections supersede, they never
  overwrite (the `*_CORRECTED` event pattern; `.claude/rules/persistence.md`).
- Provenance matters — a fact's origin is preserved, not inferred after the fact.
- Local-first / offline-first correctness — no feature may require a backend or degrade
  silently offline.

## Architecture-layer boundaries

```
src/engine/         pure, deterministic, no I/O, never imports application/* or persistence/*.
src/application/     commands + queries, sole gateway to persistence/db.ts.
src/domain/          pure shared types.
src/persistence/     Dexie schema, backup/restore, legacy-format compat.
src/ui/              screens + components, calls application/* only.
```

Mechanically enforced by `npm run check:architecture`. Full detail in `AGENTS.md` and
`.claude/rules/engine.md` / `persistence.md` — not duplicated here.

## Escalate before continuing (do not guess)

Engine behavior changes; recommendation-priority changes; command/event semantic changes; new
or destructive schema/migration; correction-model changes; historical fixture modification;
backup-contract changes; removing user capability; a meaningful new runtime dependency; external
provider/account/backend introduction; a composition change that materially changes how
recommendation authority or user choice is experienced; or a genuine conflict between current
code and higher authority. Obtain Gavin's bounded approval for any boundary not already approved
in the objective. Agents have no independent product authority; unresolved conflicts stop work.

## No scope invention

Implement the approved brief's scope. Ordinary implementation details are within that approval;
expanded product behavior or Protected boundaries require an owner ruling.

## Baseline & checkout discipline

- Never branch from an assumed/local `master` — always `git fetch origin master` first and
  record the exact starting SHA in the brief.
- One objective, one active Builder, one branch, one declared expected footprint. Use the existing
  isolated cloud checkout; do not create a worktree unless the owner requests one.
- Verify repository state (`git rev-parse HEAD`, `git status`) inside the checkout before
  writing any code.

## Review and integration safeguards

- Every PR requires Gavin's merge approval, including Routine work. No self-merge or automatic
  merge. Integration is a distinct, explicitly owner-authorized step after verification, resolved
  findings, green required CI, and independent exact-head review for Protected work. No provider
  is specifically required as Reviewer or Integrator.
- For this personal repository, reviewer independence means a separate agent/session explicitly
  assigned the Reviewer role, independently inspecting an exact identified commit/SHA, recording
  evidence-backed verification and findings, and issuing a durable PASS/BLOCK verdict. The Builder
  may not supply the independent review of its own changes. A distinct GitHub account is not
  required when agents share Gavin's GitHub identity; native GitHub approval identity is supporting evidence,
  not the sole definition of independence. Gavin remains the owner and final approval authority.
- No use of admin privileges or any other mechanism to bypass a required branch-protection/
  status check, ever.
- Integration is serialized — one PR merges at a time.
- Verification is proportional to risk under DEV-FLOW-002; existing required CI is unchanged.
  `npm run verify` is the full local gate. Do not run concurrent full verification sessions: the
  browser suite has observed real IndexedDB/resource contention under concurrent load.

## SERIAL-ONLY seams

A seam marked SERIAL ONLY means **only one implementation owner may modify it concurrently** —
it does not forbid a builder/reviewer pair (whichever two agents hold those roles on a given
objective, under DEV-FLOW-002) from working on it; it forbids two simultaneous
*builders*. `src/engine/**`, `domain/common/types.ts`, `persistence/**`,
`src/ui/screens/today/**`, and `src/ui/styles/global.css` are the current SERIAL-ONLY seams.

## Historical-branch disposition rule

Before ruling an old branch merged/obsolete from ahead/behind counts alone: check
`git merge-base <branch> origin/master` first. A merge-base means normal divergence analysis
applies. **No merge-base means a disconnected lineage** (this repo has at least one confirmed
pre-history-reset discontinuity) — ahead/behind counts alone are misleading; compare
capabilities against the current tree before any conclusion.
