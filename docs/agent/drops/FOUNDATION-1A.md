---
id: FOUNDATION-1A
baseline: f32482a3c70eb2fddb9b17f8c306db849c444b13
risk_tier: ROUTINE
---

# FOUNDATION-1A // DOCTRINE & ARCHITECTURE RECONCILIATION

## Mission

Reconcile a set of owner-approved product-language principles and behavioral guarantees
(Quiet Intelligence, Attention Supremacy, Quick Log, Automatic Time State, Human Control, No
Gamification, Progressive Disclosure, Continuity; USER_DECIDES, NO_CATCH_UP,
REDUCE_BEFORE_SKIP, ONE_PRIMARY_RECOMMENDATION, MANUAL_INPUT_ALWAYS_AVAILABLE,
AI_CANNOT_SILENTLY_CHANGE_PLANS, ENJOYMENT_COUNTS, BEYOND_MAY_DO_LESS, NO_FAKE_PRECISION)
against this repository's existing constitutional doctrine, locked Decision Register, and
implementation truth. These principles are newly approved product decisions developed after the
repository's current checkpoint, not claims that they already exist verbatim in repo canon — the
Drop's job is to give each one a precise, testable repository-level definition, preserve
existing constitutional guarantees, and surface (never silently resolve) any genuine conflict,
so later implementation Drops have a durable foundation to cite instead of re-deriving intent.

## Approved baseline

`origin/master` at `f32482a3c70eb2fddb9b17f8c306db849c444b13`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-09-16.

## Risk classification

ROUTINE. Documentation-only reconciliation: no Engine/recommendation, domain, persistence,
schema, dependency, or protected-fixture change. Confirmed no High-Risk or Architectural
semantic trigger applies per `.claude/skills/beyond-drop/SKILL.md` §1 ("docs, config that don't
cross the above → Routine").

## Authorized scope

- Produce a reconciliation matrix classifying each approved principle/guarantee as
  ALREADY_CANONICAL, SEMANTICALLY_PRESENT, NEW_CANON, or GENUINE_CONFLICT against existing
  repository doctrine/UX decisions/implementation.
- Add one new, additive, locked section to `docs/UX_DECISIONS.md` giving each principle/
  guarantee a precise, testable repository-level definition and pointer to its existing
  mechanism (or, for the one NEW_CANON item, a bounded new definition).
- Record this Drop Contract at `docs/agent/drops/FOUNDATION-1A.md` and activate/route it through
  `ACTIVE_DROP.md` via `scripts/factory-drop.mjs`.
- Report any genuine conflict found, for owner adjudication, without choosing a side.
- Report any small, extremely narrow documentation-to-code inconsistency discovered during
  reconciliation before touching application source for it.

## Explicit exclusions

- No application/UI/Engine/domain/persistence source behavior changes (an extremely small
  correction of a discovered doc-to-code inconsistency is reported to the owner first, not
  applied silently).
- No renaming or restructuring of stable existing architectural terminology (STABILIZE/RECOVER/
  EXECUTE, INFORM → INTERPRET → RECOMMEND → USER DECIDES, the five Engine recommendation kinds,
  etc.) — approved pillar names are additive product-language handles, not replacements.
- No new schema, migration, dependency, backup-format, or protected-fixture change.
- No resolution of any genuine conflict by the Builder — conflicts are reported, not decided.
- No FOUNDATION-1B or later implementation work.
- No modification of `docs/FIELD_ALPHA_CAMPAIGN.md` (unchanged historical evidence per its own
  standing rule).

## Relevant authority / references

- Direct owner authorization for FOUNDATION-1A (this session, 2026-09-16), including the
  explicit reconciliation rule (classify before writing; preserve stable architecture; report
  conflicts rather than resolve them).
- `docs/OPERATOR_INTERFACE_DOCTRINE.md` — constitutional authority these principles are
  reconciled against.
- `docs/UX_DECISIONS.md` — locked Decision Register; the primary target for the new section,
  per its own stated role ("This register records narrower locked product/UX adjudications
  under that doctrine").
- `docs/agent/drops/DOCTRINE-001.md` and `CHECKPOINT-003.md` — precedent for a ROUTINE,
  documentation-only Drop of this shape.
- `CLAUDE.md`'s authority order and "Repo-first / Drive-escalation policy."

## Required invariants

- `docs/OPERATOR_INTERFACE_DOCTRINE.md` remains unchanged — every concept it establishes is
  already load-bearing; this Drop names and cross-references it, never restates or supersedes it.
- No existing locked `docs/UX_DECISIONS.md` entry is weakened, reinterpreted, or contradicted —
  in particular, "Recommendation Engine — outcome ratings stay observational" is unchanged in
  substance; ENJOYMENT_COUNTS is defined narrowly enough to not reopen it.
- INFORM → INTERPRET → RECOMMEND → USER DECIDES and STABILIZE → RECOVER → EXECUTE remain the
  literal architectural terms; pillar names point to them, they do not rename them.
- `docs/FIELD_ALPHA_CAMPAIGN.md` stays byte-for-byte unchanged.

## Acceptance criteria

- A reconciliation matrix (principle | existing equivalent/evidence | classification | proposed
  treatment | files affected) is presented before any doctrine-adjacent file is edited.
- Every approved principle/guarantee has an explicit classification and, for
  ALREADY_CANONICAL/SEMANTICALLY_PRESENT/NEW_CANON items, a precise repository-level definition
  in `docs/UX_DECISIONS.md` citing real file/section evidence.
- Any GENUINE_CONFLICT item is reported with both readings and no side chosen.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md` is unmodified unless a specific, reported need is
  identified and separately confirmed.
- `git diff --check` and `npm run verify` pass.

## Required verification

Standard Routine gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && npm run build`), plus `git diff --check` and
`npm run check:risk f32482a3c70eb2fddb9b17f8c306db849c444b13` to confirm the diff stays inside
the docs/process bucket.

## Builder expectations

- Work only on `claude/foundation-1a-iy32gy`, cut from the exact baseline above.
- Present the reconciliation matrix and report before editing canonical doctrine, per the direct
  owner's reconciliation rule.
- Implement exactly the authorized documentation scope; treat any application-behavior temptation
  as a STOP condition and report it instead.
- Run the required verification, commit, and report — do not merge, do not open FOUNDATION-1B.

## Reviewer expectations

- A separate session reviews this contract plus the final diff and reconciliation matrix.
- Checks that every treated principle is evidence-backed (real file/section citation), that no
  existing locked entry was weakened, and that doctrine was left unmodified unless justified.
- Persists exact-head-bound review evidence; never merges or expands scope unilaterally.

## Integrator expectations

- A separate, explicitly authorized session merges only an approved, green PR.
- No admin-bypass of any required check.
- After merge, close FOUNDATION-1A via `node scripts/factory-drop.mjs close FOUNDATION-1A
  --integration-sha <merge-commit-sha>`; this contract file is never rewritten by closure.

## Stop / escalation conditions

- A principle's closest reading genuinely contradicts existing locked doctrine or a Decision
  Register entry (GENUINE_CONFLICT) — stop that specific item and report both readings; do not
  choose a side or proceed to document it as settled.
- Reconciling a principle would require an Engine/recommendation-priority, schema, or
  architecture-boundary change — stop and escalate; that is FOUNDATION-1B-or-later scope, not
  this Drop's.
- `origin/master` differs from the approved baseline at any point verification is re-run.
- Another Drop becomes ACTIVE concurrently.
