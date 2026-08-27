---
id: FACTORY-002
baseline: bc28f2093cf3f006df1306020bf9c9fd04e6f9fc
risk_tier: ARCHITECTURAL
---

# FACTORY-002 // DEVELOPMENT FACTORY V1

Recorded verbatim from the owner's direct in-chat authorization (2026-08-27), per this
mechanism's own "persist authorization" principle — this file is FACTORY-002 dogfooding its own
Drop Contract format as its first real instance, not a hypothetical example.

## Mission

Build the smallest durable development-factory layer that allows BEYOND Drops to be launched,
recovered, handed between agents, reviewed, and closed without the owner acting as the
information courier and without relying on one AI conversation for project state. This is
development infrastructure only — it does not change BEYOND product behavior.

## Approved baseline

`origin/master` at `bc28f2093cf3f006df1306020bf9c9fd04e6f9fc`, verified via `git fetch origin
master && git rev-parse origin/master` before branching (confirmed exact match — see this
Drop's PR for the fetch evidence).

## Risk classification

ARCHITECTURAL. No `src/engine/**`, `src/domain/**`, `src/application/**`, `src/persistence/**`,
or `src/ui/**` file is touched — by `.claude/skills/beyond-drop/SKILL.md` §1's literal path
triggers this could read as Routine. It is classified ARCHITECTURAL anyway because it introduces
a new, repo-wide mechanism that every future Drop is expected to pass through (a Drop Contract
format, an ACTIVE_DROP gate, a bootstrap/validation script, and a Reviewer Evidence Contract) —
a cross-cutting process boundary, not a docs-only edit. `npm run check:risk` was run for
evidence (see this Drop's verification record) and, as expected for a process/tooling-only diff,
did not itself report an ENGINE/DOMAIN/PERSISTENCE/DEPENDENCY trigger; the ARCHITECTURAL call
here is a semantic judgment on top of that evidence, per this repo's own "semantic, not
path-based" classification doctrine.

## Authorized scope

1. **Durable Drop Contract** — a canonical repository-native template/format for an approved
   Drop contract, preserving at minimum: Drop ID, title/mission, approved baseline, risk
   classification, authorized scope, explicit exclusions, relevant authority/references,
   required invariants, acceptance criteria, required verification, Builder/Reviewer/Integrator
   expectations, and stop/escalation conditions.
2. **Active Drop manifest** — one canonical `ACTIVE_DROP` representation identifying the
   currently authorized Drop, holding only durable authorization/routing facts, with at most one
   active Drop at a time.
3. **Safe bootstrap/validation** — a small deterministic script, zero new runtime dependencies,
   using the repository's existing runtime/tooling, that validates launch conditions (wrong
   repository, wrong baseline, dirty/unsafe working state, conflicting active Drop,
   malformed/missing contract) before work begins, and fails closed with actionable errors,
   never destructively.
4. **Role-based handoffs** — durable, vendor-neutral BUILDER/REVIEWER/INTEGRATOR handoff
   expectations, recoverable by a fresh agent regardless of which agent/vendor fills a role.
5. **Reviewer evidence** — an explicit contract requirement that Reviewer completion leaves
   durable, exact-head-bound review evidence (reviewed head SHA, verdict, findings or explicit
   none, merge-readiness) retrievable by the control plane without the owner relaying it,
   preferring existing GitHub PR review/comment mechanisms over any bespoke store.
6. **Fresh-chat recovery** — a fresh agent with repository access must be able to determine
   whether a Drop is active, what it is, what was authorized, the approved baseline, relevant
   authority, its own role expectations, what must be verified, and where review evidence lives,
   without the owner reconstructing the project from conversation history. Tested directly.
7. **Closure/checkpoint** — the smallest safe mechanism for retiring `ACTIVE_DROP` after
   successful integration, preserving historical Drop contracts rather than overwriting them.

## Explicit exclusions

- No BEYOND product behavior change; no Engine semantic change; no canonical user-data semantic
  change.
- No Jira-equivalent, no generalized workflow/orchestration platform, no agent scheduler, no
  autonomous merge bot, no custom CI system, no custom GitHub client.
- No duplication of live Git/GitHub/CI truth into a stale manifest.
- No new runtime dependency unless absolutely required (none was required; none was added).
- No FACTORY-003; no next product Drop; no unrelated cleanup.

## Relevant authority / references

- Direct owner authorization, in-chat, 2026-08-27 (this Drop's assigning message) — top of
  `CLAUDE.md`'s and `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s authority order ("Direct owner
  decision").
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` — shared engineering invariants (baseline/worktree
  discipline, no self-merge, SERIAL-ONLY seams).
- `docs/agent/BEYOND_DELIVERY_PROTOCOL.md` — standing Drop rules this mechanism operationalizes,
  not replaces.
- `.claude/skills/beyond-drop/SKILL.md` — existing task-contract templates (§2), verification
  (§3), failure-disposition mechanism (§3b), report templates (§4), ship procedure (§5), and the
  multi-agent operating model (§8) this Drop extends with a new §9 rather than duplicating.
- Live field evidence from NUTRITION-001 (this same conversation): the first independent review
  of PR #33 stayed trapped in a private Reviewer conversation and required the owner to copy it
  by hand; the second review instead persisted exact-head verdict evidence directly to PR #33,
  and was recovered independently from GitHub without the owner relaying it. This is the
  concrete precedent the Reviewer Evidence Contract (scope item 5) codifies.

## Required invariants

- Everything in `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` (architecture-layer boundaries,
  no-self-merge, baseline/worktree discipline) — unaffected, since no `src/**` file is touched.
- `npm run check:architecture` continues to pass (no source files touched).
- No BEYOND product screen, command, query, engine module, or persistence schema is added,
  removed, or changed in meaning.
- Historical Drop Contract files, once recorded, are never deleted or overwritten by the
  closure mechanism.

## Acceptance criteria

A. A valid approved Drop can be represented durably — this file, `FACTORY-002.md` itself, is
   the proof: it is a real, complete Drop Contract instance validated by
   `node scripts/factory-drop.mjs validate FACTORY-002 --baseline bc28f2093cf3f006df1306020bf9c9fd04e6f9fc`.
B. A fresh agent can recover the active Drop and its authorized contract from repository-native
   material alone — proved by `tests/factory/factoryDrop.test.ts`'s "fresh-agent recovery"
   suite (`status` reports id/baseline/branch/contract path plus live git facts) and directly
   exercisable via `node scripts/factory-drop.mjs status`.
C. Invalid/missing/malformed contracts fail safely — proved by
   `tests/factory/factoryDrop.test.ts`'s "malformed/missing Drop contract" suite (missing file,
   missing section, invalid risk tier, id/filename mismatch).
D. Wrong baseline fails safely — proved by the "launch/bootstrap safety" suite's
   `WRONG_BASELINE` test, naming both the actual and expected SHA.
E. Conflicting active-Drop state fails safely — proved by the "active-Drop semantics" suite
   (`CONFLICTING_ACTIVE_DROP`, idempotent re-launch of the same Drop, launch after closure).
F. Unsafe local state is not destroyed or silently modified — proved by the "unsafe local
   state" suite (dirty-tree refusal by default; `--allow-dirty` override leaves the dirty file
   byte-identical; the script never runs a destructive git command).
G. Builder/Reviewer/Integrator responsibilities are recoverable without vendor-specific
   assumptions — the Drop Contract template's Builder/Reviewer/Integrator sections and
   `.claude/skills/beyond-drop/SKILL.md` §8/§9 name roles, never agents/vendors, by construction.
H. Reviewer instructions require exact-head-bound durable review evidence retrievable outside
   the Reviewer conversation — the template's Reviewer expectations section and SKILL.md §9's
   Reviewer Evidence Contract state this explicitly.
I. Closure retires `ACTIVE_DROP` without destroying historical Drop authority — proved by the
   "closure preserves historical Drop authority" suite (Drop Contract file byte-identical after
   close; `ID_MISMATCH`/`NOTHING_TO_CLOSE` fail safely).
J. Existing repository verification remains green — `npm run verify` run in full for this Drop
   (see PR verification evidence).
K. No BEYOND product behavior changes — zero files under `src/` are touched by this Drop.

## Required verification

`npm run verify` (architecture boundaries + full test suite, including the new
`tests/factory/factoryDrop.test.ts`, + production build) plus `npm run check:risk
origin/master` for classification evidence, per `.claude/skills/beyond-drop/SKILL.md` §3.

## Builder expectations

Standard, per `docs/agent/drops/TEMPLATE.md` — worktree cut from the verified baseline above,
exactly the authorized scope, `npm run verify` before opening a PR, PR opened then stop (no
self-merge, no self-review, no further Drop), Builder handoff persisted on the PR itself.

## Reviewer expectations

Standard, per `docs/agent/drops/TEMPLATE.md`, plus this Drop's own subject matter: the Reviewer
should specifically exercise this mechanism's recovery property directly (read `ACTIVE_DROP.md`
+ this contract + run `node scripts/factory-drop.mjs status` from a clean state, without reading
the Builder's session reasoning) as part of adversarial verification, and must persist
exact-head-bound review evidence on this Drop's PR per the Reviewer Evidence Contract
(`.claude/skills/beyond-drop/SKILL.md` §9) — the same durable-evidence property this Drop exists
to codify.

## Integrator expectations

Standard, per `docs/agent/drops/TEMPLATE.md`. After merge, the Integrator (or whoever performs
closure next) runs `node scripts/factory-drop.mjs close FACTORY-002 --integration-sha
<merge-commit-sha>` to retire this Drop's `ACTIVE_DROP` record; this Drop Contract file is never
deleted or rewritten by that step.

## Stop / escalation conditions

- Any requirement above conflicting with `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` or a
  locked `docs/UX_DECISIONS.md` entry.
- Any implementation path that would require touching `src/**`, adding a runtime dependency, or
  building any of the explicitly excluded systems (Jira-equivalent, workflow engine, agent
  scheduler, autonomous merge bot, custom CI system, custom GitHub client).
- Any genuine ambiguity about product/authority scope that only the owner can resolve.
