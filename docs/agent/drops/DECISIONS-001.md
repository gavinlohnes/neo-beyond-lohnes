---
id: DECISIONS-001
baseline: 8da35b29fd246d568698f816617007f6665f95b4
risk_tier: ROUTINE
---

# DECISIONS-001 // Record BODY-reveal and outcome-biasing rulings; backfill INTENT-ARBITRATION-001

## Mission

Immediately after DEPTH-001 shipped, two follow-up questions were asked directly and answered
by the owner in this session: (1) should the new "exposed machinery" reveal extend to BODY, and
(2) should Rated Outcome history ever bias/tie-break the Engine's recommendation selection. Both
came back "no — keep it as it already is." This Drop records both rulings in
`docs/UX_DECISIONS.md` so a future session doesn't re-raise either as an open question. While
writing these entries, two genuine gaps were found and backfilled in the same pass: (a)
`INTENT-ARBITRATION-001` (the Obligation-arbitration Engine-priority ruling from earlier this
session) was never itself recorded in the Decision Register — only in
`src/domain/common/types.ts`'s doc comment and its own Drop Contract; (b) the BODY entry's own
cross-reference to "DEPTH-001's PCB-trace reveal" pointed at a section that didn't actually
document DEPTH-001 — DEPTH-001 itself had never been recorded in the register either. Both are
now backfilled so every cross-reference in this Drop's diff resolves to something real.

## Approved baseline

`origin/master` at `8da35b29fd246d568698f816617007f6665f95b4`, verified via
`git fetch origin master && git rev-parse origin/master` — DEPTH-001's own closure commit.

## Risk classification

**ROUTINE.** Documentation-only — one file, `docs/UX_DECISIONS.md`, zero source/test/schema/
dependency/workflow changes. Every fact recorded is either a verbatim transcription of a ruling
already made explicitly in this session's chat (not inferred), or (for the backfilled
INTENT-ARBITRATION-001 entry) a direct summary of that Drop's own already-merged code and its
own Drop Contract — not a new decision being made now.

## Authorized scope

- `docs/UX_DECISIONS.md`:
  - New bullet under the existing `## BODY` section recording that DEPTH-001's reveal
    deliberately does not extend to BODY (direct owner ruling, this session).
  - New `## Recommendation Engine — outcome ratings stay observational` section recording that
    Rated Outcome history never biases/tie-breaks Engine selection (direct owner ruling, this
    session).
  - New `## Intent & Commitment — Obligations enter Engine recommendation arbitration
    (INTENT-ARBITRATION-001)` section, backfilling the already-shipped, already-merged ruling
    from earlier this session (rank + eligible tiers), so the outcome-ratings entry's own
    cross-reference resolves to something real.
  - New bullet at the end of the existing `## Visual system — red budget` section, backfilling
    DEPTH-001 itself (the four-pass mockup review history, final approved look, and its
    relationship to that section's own pre-existing "ambient motion stays deferred" framing),
    so the BODY entry's cross-reference to it resolves to something real.

## Explicit exclusions

- No change to any other doc (`CLAUDE.md`, `docs/OPERATOR_INTERFACE_DOCTRINE.md`,
  `docs/agent/CAPABILITY_MAP.md`, `docs/agent/CURRENT_CHECKPOINT.md`, `README.md`) — scope is
  `docs/UX_DECISIONS.md` only.
- No source, test, schema, or dependency change of any kind.
- No new product decision — every entry records a ruling already made (two explicitly this
  session, one already shipped in code earlier this session), not a fresh judgment call by the
  Builder.

## Relevant authority / references

- Direct owner answers, this session, to two `AskUserQuestion` prompts immediately following
  DEPTH-001's completion: "Skip BODY (Recommended)" and "No — stays observational
  (Recommended)."
- `docs/agent/drops/INTENT-ARBITRATION-001.md` and `src/domain/common/types.ts`'s
  `RecommendationKind` doc comment, for the backfilled entry's factual content.

## Required invariants

- Every fact recorded is independently traceable to either this session's own chat record or
  already-merged code — nothing here is invented.
- No new product/process authority is created — the register remains a record of decisions
  already made, not a source of new doctrine.

## Acceptance criteria

- `docs/UX_DECISIONS.md` accurately records both new rulings and the backfilled
  INTENT-ARBITRATION-001 entry, with no dangling/false cross-references (the outcome-ratings
  entry's reference to the Intent & Commitment section must resolve to a section that actually
  exists in the same file).
- `npx tsc -b`, `npm run check:architecture`, `npm run build` all pass (docs-only diff; included
  for the standard gate, not because any are expected to be affected).
- `git diff` touches exactly one file: `docs/UX_DECISIONS.md`.

## Required verification

Standard ROUTINE gate per `.claude/skills/beyond-drop/SKILL.md` §3. Given the diff is
documentation-only, the substantive verification is fact-checking (comparing each new bullet
against the actual chat ruling or the actual already-merged code) rather than the mechanical
gate, which is run anyway for completeness.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR and
stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing from
this contract and the final diff only, spot-checking that the BODY and outcome-ratings entries
match the actual `AskUserQuestion` answers recorded in this session, and that the backfilled
INTENT-ARBITRATION-001 entry accurately reflects that Drop's real, already-merged code (not
just its own PR description's claims). Never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved,
reviewed, green PR; no admin-bypass; closes `ACTIVE_DROP.md` via `node scripts/factory-drop.mjs
close DECISIONS-001 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to editorialize, add a claim not directly traceable to chat or already-merged
  code, or answer a still-open product question while "just recording the docs."
