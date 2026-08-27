---
name: beyond-drop
description: BEYOND repo's Drop workflow — task-contract templates, semantic risk classification, verification, and the git/CI ship procedure for a single BEYOND Drop (routine, architectural, or high-risk change).
---

# BEYOND Drop workflow

One cohesive procedure for running a BEYOND Drop end to end: state the contract, classify risk
semantically, implement, verify, report, ship, confirm CI. This is process scaffolding — it
does not add product doctrine beyond what `CLAUDE.md` and `docs/UX_DECISIONS.md` already state.

## 1. Risk classification — semantic, not path-based

Path detection is only a **prompt to inspect** what changed — it is never the final risk
decision. A path on the lists below means "look closely," not "automatically escalate."

**ARCHITECTURAL → Standard report.** Real triggers:
- Meaningful Engine/recommendation architecture (`src/engine/**`) — a new recommendation kind, a
  changed selection/priority/threshold rule, a changed trace shape. A comment, formatting, or
  non-behavioral refactor in the same files is NOT this tier.
- Canonical domain semantic/type changes (`src/domain/**`) — a new field, a changed enum, a
  changed invariant. Touching the file without changing what a type means is NOT this tier.
- Cross-module architectural boundaries — e.g. changing what `application/*` exposes to `ui/*`,
  or how one layer is allowed to call another.

**HIGH-RISK → High-Risk report.** Real triggers:
- Persistence schema/migration (`src/persistence/db.ts` version/table shape changes).
- Backup/restore contract (`src/persistence/backup.ts`, `restore.ts`, `compat/legacyBackup.ts`
  behavior changes).
- Correction-model changes (the `*_CORRECTED` event pattern, effective-value resolution).
- Protected historical fixtures (`test-fixtures/protected/**`, or anything changing how they're
  parsed/imported).
- Dependency/devDependency/package-manager changes — actual `dependencies`/`devDependencies`
  entries or lockfile changes. A `package.json` edit that only adds/edits a `scripts` entry is
  NOT a dependency-risk event.
- Other explicit compatibility/data-risk boundaries already governed by `docs/UX_DECISIONS.md`.

**Everything else → Routine → Micro report.** UI-only, copy-only, test-only additions, docs,
config that don't cross the above.

A Drop that trips an Architectural trigger runs at least the Architectural process with a
Standard report. A Drop that trips a High-Risk trigger runs the High-Risk process with a
High-Risk report. Don't apply the High-Risk report to an Architectural-only Drop, and don't
downgrade a real High-Risk trigger to Standard because most of the diff is routine.

Any High-Risk trigger, or a genuine conflict with `CLAUDE.md`/the Decision Register, escalates
to the owner before implementation proceeds — see `CLAUDE.md`'s "Escalate before continuing"
and "Repo-first / Drive-escalation policy" sections.

## 2. Task-contract templates

**Routine**
```
Scope:
Files expected:
Risk tier: ROUTINE
```

**Architectural**
```
Scope:
Files expected:
Semantic change (what actually changes in meaning/behavior, not just which files):
Risk tier: ARCHITECTURAL
Drive needed: NO / <doc, if YES>
```

**High-Risk**
```
Scope:
Files expected:
Boundary crossed: schema/migration | backup-restore contract | correction-model |
                  protected fixtures | dependency change | other (name it)
Owner ruling obtained: YES / NO — if NO, stop and escalate before implementing
Risk tier: HIGH-RISK
Drive needed: NO / <doc, if YES>
```

## 3. Verification

Run `npm run verify` (= `check:architecture && vitest run && npm run build`). `build` already
runs `tsc -b` internally, so this covers architecture-boundary check + typecheck + full test
suite + production build — the same meaningful steps CI runs — without running typecheck twice.
This is the local final gate; keep it aligned with `.github/workflows/deploy-pages.yml` and
`.github/workflows/pr-verify.yml` if either workflow's meaningful steps ever change (CI itself
is not modified by this skill).

Two machine checks back this up, both zero-dependency Node scripts:
- `npm run check:architecture` (`scripts/check-architecture-boundaries.mjs`) — hard-fails on an
  Engine → application/persistence import, an application → ui import, or a new ui → persistence
  direct import outside the documented pre-existing allowlist. Part of `npm run verify`, so it
  runs locally and in both CI workflows.
- `npm run check:risk [baseRef]` (`scripts/classify-risk.mjs`, default `origin/master`) —
  buckets the current diff by path (Engine/domain/persistence-schema/backup/protected-fixtures/
  dependencies/UI/process-docs) and prints a suggested minimum tier. This is evidence for the
  risk classification in §1, not a replacement for it — it does not fail the build for Engine/
  domain/dependency triggers on its own. The one hard, build-failing gate: `test-fixtures/
  protected/**` changed without `tests/compat/fixtureIntegrity.test.ts` also changing in the same
  diff exits 1 — an unacknowledged protected-fixture byte change is treated as an accident, not a
  judgment call. `.github/workflows/pr-verify.yml` runs this against the PR's actual base SHA.

High-Risk Drops additionally run whatever compatibility surface the boundary touches before
calling verification complete — e.g. `npx vitest run tests/compat/` for anything near protected
fixtures or legacy-format parsing, or the relevant `tests/integration/*` for schema/migration or
restore-wiring changes.

## 3a. PR verification vs. deployment (kept separate)

`.github/workflows/pr-verify.yml` runs the full verification chain (architecture check, typecheck,
full test suite including Playwright/browser tests, risk classification against the PR's base,
production build) on every pull request targeting `master`. It deploys nothing. `.github/
workflows/deploy-pages.yml` is unchanged: it only runs on an actual push to `master` (i.e. after a
PR has merged) and is the sole workflow that deploys. A PR can be fully verified without ever
publishing anything, and nothing deploys without first having been verified as a PR (once branch
protection in §7 is in place) or, at minimum, deploying only from an already-merged master.

## 3b. Failure-disposition mechanism

When verification (local or CI) fails, or a review surfaces something wrong, name which of these
it is before fixing it — this determines where the fix belongs, not just that a fix happens:

1. **One-off** — a mistake local to this Drop's own change; fix it in the same Drop, no other
   artifact needs to change.
2. **Regression test** — a real behavior gap verification didn't previously catch; add/extend a
   test alongside the fix so it can't silently regress again.
3. **Architecture rule** — the failure reveals a boundary that should be mechanically enforced;
   extend `scripts/check-architecture-boundaries.mjs` or a `.claude/rules/*` file.
4. **Repository guidance** — `CLAUDE.md` or a `.claude/rules/*` file was ambiguous or silent on a
   case that came up; clarify it in place, don't just fix the symptom.
5. **Skill** — the same manual procedure was reconstructed from memory again; fold it into this
   skill instead of re-describing it in a future Drop's report.
6. **Hook/CI** — a check that's currently manual (e.g. a step run by hand) should run automatically
   on every relevant push/PR; wire it into `pr-verify.yml` or `deploy-pages.yml`.
7. **FIELD contract** — a past campaign's stated visual/UX doctrine (see `docs/UX_DECISIONS.md`)
   was violated or under-specified; correct the doctrine record, not just the code.
8. **Authority correction** — the owner's actual intent differs from what a repo doc currently
   says; escalate and update the doc once corrected, rather than silently overriding it.
9. **Factory-policy improvement** — this skill's own process (templates, tiers, ship procedure)
   has a gap the failure exposed; propose the smallest edit to this file that closes it.

Pick the narrowest disposition that actually explains the failure — don't reach for "factory-policy
improvement" when it was a one-off, and don't call something a one-off if the same class of
mistake would recur under this same skill's current rules.

## 4. Report templates

**Micro** (Routine Drops)
```
Commit:
Change:
Verified:
```

**Standard** (Architectural Drops)
```
Commit:
Scope:
Behavioral effect:
Files/config changed:
Context/process improvements:
Protected invariants:
Verification:
Deviations:
Risks:
Human acceptance needed:
Next safe action:
```

**High-Risk** (High-Risk Drops) — Standard, plus:
```
Boundary crossed:
Owner ruling obtained:
Rollback plan:
Compatibility verification (fixture integrity / migration / backup-restore round-trip, explicit results):
```

## 5. Ship procedure (git + CI confirmation)

Every Drop that merges follows the same sequence — this repo has no stored `gh` auth, so CI is
confirmed via the GitHub REST API directly, never the Actions summary list:

```
git checkout -b <topic-branch>
# ...implement, commit...
git push -u origin <topic-branch>
git checkout master
git merge --no-ff <topic-branch> -m "Merge branch '<topic-branch>'"
git push origin master
git rev-parse HEAD   # the merge commit to confirm CI on
```

Poll that exact merge commit's checks (not the Actions list):
```
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | grep '^password=' | cut -d= -f2)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/<owner>/<repo>/commits/<sha>/check-runs"
```
Poll until `status` is `completed`; confirm every check's `conclusion` is `success` before
reporting the Drop done. Delete the local topic branch once merged.

## 6. Repo-first / Drive escalation

Default repo-first for every Drop tier — see `CLAUDE.md`'s "Repo-first / Drive-escalation
policy" for the exact four conditions that warrant a Drive read. Don't re-derive that policy
here; this skill only reminds you it exists before a High-Risk Drop's task contract asks
"Drive needed?".

## 7. Branch protection (master)

`master` requires the `PR Verification` status check (from `pr-verify.yml`) to pass, with
`enforce_admins: false` and no required PR-review count — configured via the GitHub REST API
(`PUT /repos/.../branches/master/protection`) using the same `git credential fill`-sourced token
as the CI-poll step in §5. Because `enforce_admins` is off and the repo owner has admin
permission, the §5 direct-push ship procedure (branch → commit → merge --no-ff → push master)
is **not** blocked by this — admin pushes bypass required checks entirely. The required check
only actually gates a PR opened through GitHub's own UI/API by a non-admin (or an admin choosing
to go through PR review); it does not turn every Drop into a mandatory-PR workflow.

To change what's required (e.g. add a second check, or start enforcing for admins too once the
team grows), re-run the same PUT with an updated payload — don't hand-edit protection in the
GitHub UI without recording the change here.

## 8. Multi-agent operating model

Claude and Codex share this same Drop procedure — it does not replace it. See
`docs/agent/BEYOND_ENGINEERING_CONTRACT.md` for the full shared, tool-neutral invariants this
section operationalizes for the Drop workflow specifically.

**FACTORY // CODEX BUILDER CUTOVER** — direct owner ruling, verified baseline
`ba6e47b79977ce1ddc19ee9ebddbff31c023b60d` (2026-08-26), superseding the former Pilot V1 role
lock recorded under HISTORY below. Codex is now authorized to act as BEYOND's primary Builder
when explicitly assigned to a Drop. Builder, Reviewer, and Integrator remain three distinct
responsibilities and must run as three separate sessions on any one Drop — no session may review
or merge its own work, regardless of which agent holds which role. Every other safeguard already
in force (baseline/branch/worktree discipline, CI, independent review for Architectural/
High-Risk Drops, no-self-merge) carries forward unchanged, below.

- **Roles are assigned per Drop, not fixed by agent identity**: Gavin assigns either Claude or
  Codex as Builder for a given Drop, based on availability and suitability; only one agent owns
  Builder for that Drop. Every Drop receives a separately assigned Reviewer session when
  independent review is required — Claude or Codex may serve as Reviewer, whichever agent is not
  the Builder for that Drop. The Builder session may never review or integrate its own work;
  separate session/worktree responsibility — not agent identity — is the controlling safeguard.
  A Drop whose tier requires a distinct Integrator uses a third session for that step (see
  `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s Integration discipline).
- **Baseline**: every task contract records the exact `origin/master` SHA (fetched fresh, never
  assumed), branch owner, worktree path, and declared expected footprint.
- **Worktrees**: `git fetch origin master && git worktree add
  ../beyond-worktrees/<agent>-<slug> -b <branch> origin/master`. One task, one owner, one
  branch, one worktree.
- **SERIAL-ONLY seams** (`src/engine/**`, `domain/common/types.ts`, `persistence/**`,
  `src/ui/screens/today/**`, `src/ui/styles/global.css`): only one implementation owner may
  modify these concurrently, regardless of which agent that owner is — this forbids two
  simultaneous builders on the same seam, not a builder/reviewer pair working together, and not
  any particular agent from building there.
- **Review handoff**: the Reviewer session reviews from a separate, read-only worktree at the
  PR's exact commit, working from the task contract + diff only — never the Builder's own
  session reasoning. Targeted adversarial verification by default; full `npm run verify` only
  when warranted, never concurrently with the Builder's own verification run.
- **No self-merge** — applies to every Drop under this model, regardless of which agent is
  Builder: the agent that builds a Drop never merges its own PR. Integration is a distinct,
  explicitly authorized step, after builder verification + independent review (when applicable)
  + dispositioned findings + green CI. No admin-bypass of required checks, under any
  circumstance — §7's admin-bypass path above is not used for agent-driven integration.
- **Post-merge verification is smoke/deployment-focused** (confirm the merge commit's deploy run
  succeeds) unless the Drop's risk tier requires more.
- **Historical-branch disposition**: check `git merge-base <branch> origin/master` before
  concluding a branch is unmerged from ahead/behind counts alone — no merge-base means a
  disconnected lineage, requiring capability comparison against the current tree, not a numeric
  count, before any delete/archive ruling.

### HISTORY — superseded Pilot V1 role lock

Pilot V1 (through the FACTORY // CODEX BUILDER CUTOVER above) ran with roles locked: Claude =
default Builder; Codex = read-only Pre-mortem + Independent Reviewer only, with role reversal
explicitly out of scope for that phase, pending an admission test once Pilot V1 evidence
justified revisiting it. That lock is superseded, in full, by the direct owner ruling above —
kept here for provenance, not as current operating guidance.

## 9. Development Factory V1 (FACTORY-002)

Repository-native mechanism so a Drop can be launched, recovered, handed between agents,
reviewed, and closed without the owner acting as the information courier and without relying on
any one AI conversation for project state. This section operationalizes §§1-8 above — it does
not replace the risk classification, verification, ship procedure, or multi-agent model already
stated there. Persist authorization; derive observation: the files below hold only durable
authorization/routing facts a person or a fresh agent would otherwise have to be told by hand —
never a live fact Git/GitHub/CI can already prove (current HEAD, CI status, mergeability, PR
review state), which is always re-derived at the moment it's needed instead.

### Drop Contract

`docs/agent/drops/TEMPLATE.md` is the canonical Drop Contract format. Every Drop that uses this
mechanism gets its own `docs/agent/drops/<DROP-ID>.md`, copied from the template and filled in —
Drop ID, mission, approved baseline, risk classification, authorized scope, explicit exclusions,
relevant authority/references, required invariants, acceptance criteria, required verification,
and Builder/Reviewer/Integrator expectations. `docs/agent/drops/FACTORY-002.md` is this Drop's
own contract, recorded as the first real instance of the format. A Drop Contract file, once
recorded, is never deleted or overwritten — it is this repository's permanent record of what was
actually authorized for that Drop, independent of what any single conversation remembers.

### ACTIVE_DROP

`docs/agent/ACTIVE_DROP.md` is the single canonical pointer to whichever Drop is currently
authorized — its `id`, `status` (`ACTIVE` or `CLOSED`), declared `baseline`, `branch`, the
`contract` file it points to, and the `pr`/`builder`/`reviewer`/`integrator` routing fields as
they become known. At most one Drop may be `ACTIVE` at a time. This file lives on `master`'s own
history (updated by small, direct commits, the same pattern already used for
`docs/agent/CURRENT_CHECKPOINT.md`), not inside a Builder's own feature branch — a new Drop's
`ACTIVE_DROP` activation (via `init`, below) is expected to land on `master` *before* a Builder's
worktree is cut from it, so the launched Drop is already the recorded active one the moment
implementation begins. (FACTORY-002 itself is the one unavoidable exception: the mechanism does
not exist on `master` before this Drop creates it, so its own first activation necessarily ships
inside this Drop's own PR.)

### Bootstrap / validation script

`scripts/factory-drop.mjs` (zero new dependencies, same plain-Node style as
`scripts/check-architecture-boundaries.mjs` and `scripts/classify-risk.mjs`) is the deterministic
gate:

```
node scripts/factory-drop.mjs validate <id> --baseline <sha> [--allow-dirty]
node scripts/factory-drop.mjs init     <id> --baseline <sha> --branch <name> [--builder <note>]
node scripts/factory-drop.mjs status
node scripts/factory-drop.mjs close    <id> --integration-sha <sha>
```

`validate`/`init` re-derive and check, every time, never trusting memory: the `origin` remote is
the expected repository; `origin/master` (freshly fetched) matches the declared baseline; the
working tree is clean (refuse to launch over unknown/uncommitted work, unless `--allow-dirty` is
passed deliberately); no *other* Drop is already `ACTIVE`; and the target Drop Contract exists,
parses, declares a valid risk tier, and contains every required section. Every failure is
reported with a specific code (`WRONG_REPOSITORY`, `WRONG_BASELINE`, `UNSAFE_LOCAL_STATE`,
`CONFLICTING_ACTIVE_DROP`, `MALFORMED_CONTRACT`, `CONTRACT_BASELINE_MISMATCH`, …) and an
actionable message — never a silent fallback, never a destructive action. `status` is read-only
and safe to run at any time; it is the fresh-agent recovery entry point (see below). `close`
retires `ACTIVE_DROP` (flips `status` to `CLOSED`, records the integration SHA) without ever
touching the Drop Contract file. `tests/factory/factoryDrop.test.ts` proves all of this against a
hermetic, fully-local fixture repository (a real `git init --bare` origin, no network required)
— recovery and failure paths, not only the happy path.

### Role-based handoffs

BUILDER / REVIEWER / INTEGRATOR are roles, never vendor identities — §8 above already states
this for the multi-agent model generally; this mechanism carries it into the Drop Contract
itself. `ACTIVE_DROP.md`'s `builder`/`reviewer`/`integrator` fields record who currently holds
each role for routing purposes only; the actual expectations for whoever holds a role live in the
Drop Contract's own Builder/Reviewer/Integrator sections (see `TEMPLATE.md`), stated in terms of
the role, never the agent.

### Reviewer Evidence Contract

Field evidence from NUTRITION-001 (PR #33, this same operating period): the first independent
review of that PR stayed trapped inside a private Reviewer conversation and required the owner
to copy it out by hand before anyone else could act on it. The second review instead posted its
verdict as a PR comment bound to the exact reviewed head SHA — and was later recovered
independently, from GitHub, with no relay from the owner at all. That is the bar every Drop under
this mechanism now requires explicitly (see `TEMPLATE.md`'s Reviewer expectations section):
**Reviewer completion must leave durable, exact-head-bound review evidence on the Drop's PR** —
at minimum, the reviewed head SHA, a verdict, substantive findings (or an explicit "none"), and a
merge-readiness statement — using GitHub's own PR review/comment mechanisms. Finishing only
inside a private Reviewer conversation does not satisfy this requirement; no bespoke review
database or GitHub client is built or needed to satisfy it.

### Fresh-chat recovery

A fresh agent with repository access, given no more than this repository, should be able to
determine: whether a Drop is active (`node scripts/factory-drop.mjs status`, or read
`docs/agent/ACTIVE_DROP.md` directly); what Drop it is and what was authorized (follow `contract`
to `docs/agent/drops/<id>.md`); the approved baseline and relevant authority (both recorded in
that same contract); its own role's expectations (that contract's Builder/Reviewer/Integrator
sections); what must be verified (that contract's Required verification section plus §3 above);
and where review evidence lives (the recorded `pr` field, checked live on GitHub — never assumed
from `ACTIVE_DROP.md` itself, which never carries live PR/CI state). None of this requires the
owner to reconstruct the project from conversation history.

### Closure

After a Drop's PR merges, whoever performs closure (typically the Integrator) runs
`node scripts/factory-drop.mjs close <id> --integration-sha <merge-commit-sha>` directly against
`master` and commits the result — the same small-direct-commit pattern `ACTIVE_DROP.md`
activation already uses. This flips `ACTIVE_DROP.md`'s `status` to `CLOSED` and records the
integration SHA; it never deletes or rewrites the Drop Contract file, which remains this
repository's permanent record of what that Drop was authorized to do.
