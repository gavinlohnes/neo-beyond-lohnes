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

Run `npm run verify` (= `vitest run && npm run build`). `build` already runs `tsc -b` internally,
so this covers typecheck + full test suite + production build — the same meaningful steps CI
runs — without running typecheck twice. This is the local final gate; keep it aligned with
`.github/workflows/deploy-pages.yml` if that workflow's meaningful steps ever change (CI itself
is not modified by this skill).

High-Risk Drops additionally run whatever compatibility surface the boundary touches before
calling verification complete — e.g. `npx vitest run tests/compat/` for anything near protected
fixtures or legacy-format parsing, or the relevant `tests/integration/*` for schema/migration or
restore-wiring changes.

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
