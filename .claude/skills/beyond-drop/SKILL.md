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
