# BEYOND Engineering Contract (shared, tool-neutral)

Read by both Claude Code (via CLAUDE.md) and Codex (via AGENTS.md). The single source of
implementation-critical invariants both engineering agents must never violate, regardless of
which one is building. Not a replacement for CLAUDE.md, docs/UX_DECISIONS.md, or
.claude/rules/* — the correctness-critical subset, kept short.

## Authority order

1. Direct owner decision.
2. BEYOND Product Constitution / Operator Doctrine.
3. Canonical Spec + locked Decision Register entries (docs/UX_DECISIONS.md).
4. The current Drop's own approved task contract.
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

Mechanically enforced by `npm run check:architecture`. Full detail in `CLAUDE.md` and
`.claude/rules/engine.md` / `persistence.md` — not duplicated here.

## Escalate before continuing (do not guess)

Engine behavior changes; recommendation-priority changes; command/event semantic changes; new
or destructive schema/migration; correction-model changes; historical fixture modification;
backup-contract changes; removing user capability; a meaningful new runtime dependency; external
provider/account/backend introduction; a composition change that materially changes how
recommendation authority or user choice is experienced; or a genuine conflict between current
code and higher authority. Route to Gavin + ChatGPT — neither engineering agent has product
authority.

## No scope invention

Implement exactly the approved task contract's declared scope. A change that would expand
product behavior beyond it is a specification conflict, not something either agent resolves
unilaterally.

## Baseline & worktree discipline

- Never branch from an assumed/local `master` — always `git fetch origin master` first and
  record the exact resulting SHA in the task contract.
- One task, one owner, one branch, one worktree, one declared expected footprint.
- Verify repository state (`git rev-parse HEAD`, `git status`) inside the worktree before
  writing any code.

## Integration discipline (current phase)

- No self-merge — the agent that builds a Drop does not merge its own PR. Integration is a
  distinct, explicitly authorized step, requested only after builder verification, independent
  review (when applicable), dispositioned findings, and green required CI.
- No use of admin privileges or any other mechanism to bypass a required branch-protection/
  status check, ever.
- Integration is serialized — one PR merges at a time.
- `npm run verify` is the standard full local verification command. It is never run by two
  agents' worktrees simultaneously — this repo's browser test suite has observed real
  IndexedDB/resource contention under concurrent load.

## SERIAL-ONLY seams

A seam marked SERIAL ONLY means **only one implementation owner may modify it concurrently** —
it does not forbid a builder/reviewer pair (whichever two agents hold those roles on a given
Drop, per `.claude/skills/beyond-drop` §8) from working on it; it forbids two simultaneous
*builders*. `src/engine/**`, `domain/common/types.ts`, `persistence/**`,
`src/ui/screens/today/**`, and `src/ui/styles/global.css` are the current SERIAL-ONLY seams.

## Historical-branch disposition rule

Before ruling an old branch merged/obsolete from ahead/behind counts alone: check
`git merge-base <branch> origin/master` first. A merge-base means normal divergence analysis
applies. **No merge-base means a disconnected lineage** (this repo has at least one confirmed
pre-history-reset discontinuity) — ahead/behind counts alone are misleading; compare
capabilities against the current tree before any conclusion.
