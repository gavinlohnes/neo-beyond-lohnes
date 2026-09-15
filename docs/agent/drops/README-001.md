---
id: README-001
baseline: 71d2e714e9aa18682c657c014d1f65ffeeb7bac7
risk_tier: ROUTINE
---

# README-001 // Repair stale README against repository truth

## Mission

`README.md` was badly stale — reporting Dexie schema `6` (actual: `11`), a `68 files / 706
tests` baseline (actual: `106 files / 1,342 tests`), and a screens/architecture description that
predates Search, Review, Decision Journal, Exercise Library, Custom Programs, the check-in
reminder, and half the current engine module list. `docs/agent/CURRENT_CHECKPOINT.md`
(CHECKPOINT-003) explicitly flagged this and named it "a separately authorized docs task," not
product work. This Drop is that task: pure factual accuracy restoration, no new claims, no
judgment calls, no product decision.

## Approved baseline

`origin/master` at `71d2e714e9aa18682c657c014d1f65ffeeb7bac7`, verified via
`git fetch origin master && git rev-parse origin/master` — CHECKPOINT-003's own closure commit.

## Risk classification

ROUTINE. Documentation-only — a single file, `README.md`, zero source/test/schema/dependency/
workflow changes. Every corrected fact was independently re-derived from the current tree (grep
of `src/persistence/db.ts`'s version history, `ls` of `src/engine`/`src/ui/screens`/
`src/persistence`/`src/application`/`src/ui/components`, and a fresh `npm run verify`-equivalent
test run) — not copied from CHECKPOINT-003's own prose, though the two independently agree.

## Authorized scope

- `README.md`: correct every stale factual claim — Dexie schema version and full v1-v11
  migration history, test file/count baseline, the Architecture section's engine/persistence/
  application/ui-component-layer descriptions, the Screens section's MORE sub-screen list
  (REVIEW, SEARCH, Decision Journal, Exercise Library, Custom Programs, the Reminders section),
  and one new Known Limitations bullet for the check-in reminder's honest "no true background
  delivery" constraint (already true in shipped code, just not yet documented here).

## Explicit exclusions

- No change to any other doc (`CLAUDE.md`, `docs/UX_DECISIONS.md`, `docs/OPERATOR_INTERFACE_DOCTRINE.md`,
  `docs/agent/CAPABILITY_MAP.md`, `docs/agent/CURRENT_CHECKPOINT.md`) — this Drop's scope is
  `README.md` only.
- No new section invented (e.g. no new "Dependencies" list) — restoring accuracy to sections
  that already existed, not adding sections that didn't.
- No source, test, schema, or dependency change of any kind.
- No product decision, including the still-open Obligations-arbitration question — untouched.

## Relevant authority / references

- `docs/agent/CURRENT_CHECKPOINT.md` (CHECKPOINT-003, merged this session): "The root `README.md`
  is itself stale: it still reports schema v6 and an old 68-file/706-test baseline and omits
  several shipped screens/capabilities. Repairing README is not part of this checkpoint Drop and
  should be a separately authorized docs task." This Drop is that authorized task — pure accuracy
  restoration is not on CLAUDE.md's or BEYOND_ENGINEERING_CONTRACT.md's escalation list (no
  engine/schema/priority/dependency change), matching the same "no gate needed" tier the original
  NEXT OPERATION list already granted to "Capability Map + checkpoint refresh."

## Required invariants

- Every corrected fact is independently traceable to current repository truth, not merely copied
  from another document's claim.
- No new product/process authority is created — README remains a description of what exists, not
  a source of doctrine (unchanged from before this Drop).

## Acceptance criteria

- `README.md`'s Dexie schema version, migration history, test counts, and screens/architecture
  description all match the current tree exactly.
- `npx tsc -b`, `npm run check:architecture`, `npm run build` all pass (docs-only diff; included
  for the standard gate, not because any are expected to be affected).
- `git diff` touches exactly one file: `README.md`.

## Required verification

Standard ROUTINE gate per `.claude/skills/beyond-drop/SKILL.md` §3. Given the diff is
documentation-only, the substantive verification is the fact-checking itself (grep/`ls` against
the live tree, a fresh test run for accurate counts) rather than the mechanical gate, which is run
anyway for completeness.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR and
stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing from
this contract and the final diff only, spot-checking a sample of the corrected facts directly
against the tree (not trusting the diff's own claims), tagged CONFIRMED/PLAUSIBLE, never merge or
self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved, reviewed,
green PR; no admin-bypass; closes `ACTIVE_DROP.md` via
`node scripts/factory-drop.mjs close README-001 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to add a claim not directly verifiable against the current tree.
- Any temptation to editorialize, add new scope, or answer an open product question while
  "just fixing the docs."
