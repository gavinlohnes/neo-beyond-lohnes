---
id: INTENT-ARBITRATION-001
baseline: 8dc0cd03ebc0f9704da984a5e0cb765704aecbf0
risk_tier: ARCHITECTURAL
---

# INTENT-ARBITRATION-001 // Obligations enter Engine recommendation arbitration

## Mission

Since Drop 02, `engine/obligationRelevance.ts` has classified unresolved Obligations
(OVERDUE/DUE_TODAY/DUE_SOON/PLANNED_TODAY/WAITING/QUIET) purely for TODAY's own ATTENTION
budget — a real, immediate-consequence OVERDUE obligation and a merely YELLOW capacity state
were treated identically by `engine/evaluate.ts`'s actual recommendation: Obligations never
participated in what BEYOND tells the operator to do next. This was named directly to the owner
as a real gap during an honesty review this session, and the owner ruled on the exact mechanics
via two `AskUserQuestion` prompts (2026-09-15): a new `OBLIGATION_DUE` recommendation kind,
ranked at the **bottom of the stack — above only `NO_ACTION_REQUIRED`, below every existing
kind** — triggered only by an Obligation classified **`OVERDUE` or `DUE_TODAY`** (not
`DUE_SOON`/`PLANNED_TODAY`, which remain advisory-only). This Drop implements exactly that
ruling.

## Approved baseline

`origin/master` at `8dc0cd03ebc0f9704da984a5e0cb765704aecbf0`, verified via
`git fetch origin master && git rev-parse origin/master` — README-001's own closure commit.

## Risk classification

ARCHITECTURAL. A new `RecommendationKind`, a changed Engine priority order, and a new narrow,
explicitly authorized exception to `evaluate.ts`'s "never import `obligationRelevance.ts`"
boundary — all three are named on CLAUDE.md's own escalation list ("recommendation-priority
changes," "command/event semantic changes," "a genuine conflict between current code and higher
authority" is avoided only because the owner ruled on it directly). Not HIGH-RISK: no schema
change, no destructive migration, no removed user capability, no new dependency.

## Direct owner ruling (the authorizing decision)

Obtained via `AskUserQuestion`, 2026-09-15, in this session:

1. "Where should a new OVERDUE/DUE_TODAY Obligation kind rank against the existing 5?" →
   **"Bottom of the stack, above only NO_ACTION_REQUIRED"** (explicitly not the recommended
   default of "Between POST_SHIFT_TRANSITION and RECOVER").
2. "Which Obligation tiers should be eligible to trigger this new kind?" →
   **"OVERDUE and DUE_TODAY (Recommended)"**.

Locked new priority order: `STABILIZE` (1) > `POST_SHIFT_TRANSITION` (2) > `RECOVER` (3) >
`EXECUTE_PLANNED_WORK` (4) > `OBLIGATION_DUE` (5) > `NO_ACTION_REQUIRED` (6, renumbered from 5).

## Authorized scope

- `src/domain/common/types.ts`: add `"OBLIGATION_DUE"` to the `RecommendationKind` closed union,
  with a doc comment recording the locked rank/eligibility ruling above.
- `src/engine/obligationRelevance.ts`: new `ARBITRATION_WORTHY_TIERS` (`OVERDUE`/`DUE_TODAY`
  only) and `hasObligationRequiringArbitration(obligations, today): boolean`, mirroring the
  existing `hasObligationRequiringAttention`'s shape exactly. Corrected top-of-file doc comment
  describing the new, narrow, authorized exception to the "evaluate.ts must never import from
  this module" boundary.
- `src/engine/evaluate.ts`: new required `hasEligibleObligationDueOrOverdue: boolean` field on
  `EvaluateInput` (the Engine receives only this one pre-computed boolean, never Obligation
  records — same pattern as `hasPlannedWork`/`hasUnresolvedPostShift`); new `OBLIGATION_DUE`
  matched-rule trace entry and `if` branch positioned after `EXECUTE_PLANNED_WORK` and before the
  final fallback; `NO_ACTION_REQUIRED`'s `priority` renumbered `5` → `6`.
- `src/application/commands.ts`: `submitCheckIn` computes the new boolean via
  `getCurrentlyEligibleUnresolvedObligations()` (existing query, unchanged) +
  `hasObligationRequiringArbitration` + `formatLocalDate(new Date())`, and passes it into
  `evaluate()`.
- `src/ui/screens/today/recommendationCopy.ts`: new `case "OBLIGATION_DUE"` in the exhaustive
  `describeRecommendationEffect` switch, and a `TRACE_KEY_LABELS` entry for the new trace key.
- `.claude/rules/engine.md`: corrected rule text describing the new narrow exception in place of
  the now-stale "evaluate.ts must never import from it" claim.
- Tests: `tests/engine/evaluate.test.ts` (priority renumbering + new `OBLIGATION_DUE` describe
  block covering firing, subordination to every higher-ranked kind, and trace correctness),
  `tests/ui/recommendationCopy.test.ts` (new kind covered by existing generic loops + one
  dedicated case), `tests/ui/resetShiftDownCopy.test.ts` (added to the "every real kind" sweep),
  4 pre-existing direct `evaluate()` call sites updated for the new required field
  (`recommendationDecline.test.ts`, `recommendationHandoff.test.ts`, `App.test.tsx`), and
  `tests/browser/SuitLayer01VisualGrammar.test.tsx` (see Explicit exclusions below — this one
  needed a behavioral update, not just a mechanical field addition).

## Explicit exclusions

- No change to `src/ui/screens/today/attentionPolicy.ts`'s existing `COMMITMENT_DUE`
  `AttentionItem`. An OVERDUE/DUE_TODAY obligation can now show both as the dominant
  Recommendation (`OBLIGATION_DUE`) and as a separate ATTENTION chip — the same accepted overlap
  `POST_SHIFT_TRANSITION` already has with its own underlying fact. Not a new decision; not
  addressed by the owner's ruling; left as-is.
- No new `RecommendationHandoffTarget` for `OBLIGATION_DUE`. The existing Commitments card's own
  "VIEW COMMITMENTS" path already provides the next action; `handoffTargetForRecommendation` in
  `application/queries.ts` simply returns `undefined` for this kind, unchanged code, correct
  behavior.
- `tests/browser/SuitLayer01VisualGrammar.test.tsx`'s "keeps NO ACTION REQUIRED quiet even with
  attention-worthy items present" test previously used an OVERDUE obligation as its ATTENTION-only
  fixture. That is now a real behavior change this Drop *intends* — an OVERDUE obligation now
  correctly earns the one dominant command surface as `OBLIGATION_DUE`, not silent
  `NO_ACTION_REQUIRED`. The test was updated: the original invariant (ATTENTION-worthy-but-not-
  arbitration-worthy items must not manufacture a fake command surface) is preserved using a
  `DUE_SOON` fixture instead, and a new test asserts the intended new behavior for `OVERDUE`
  directly.
- No change to `src/persistence/compat/legacyBackup.ts` — it reads historical fixture exports
  that predate this kind; adding a new kind going forward does not affect reading old data.
- No change to Rated Outcome history biasing/tie-breaking recommendation selection — a separate,
  not-yet-discussed Engine-priority question, explicitly out of scope here.

## Relevant authority / references

- `CLAUDE.md` "Escalate before continuing": "recommendation-priority changes... changing
  Mission/Obligation semantics... a genuine conflict between current code and higher authority" —
  satisfied by the direct owner ruling recorded above, obtained before any Engine code was
  written.
- `.claude/rules/engine.md` (pre-Drop text): "obligationRelevance.ts is a parallel interpretation
  layer, not part of evaluate.ts's arbitration... evaluate.ts must never import from it." This
  Drop is the owner-authorized, narrow exception to that rule, not a violation of it — corrected
  in place as part of this Drop's scope.
- `docs/agent/CURRENT_CHECKPOINT.md` (CHECKPOINT-003): surfaced this exact question ("Obligations
  don't affect the Engine's Recommendation") as an open item without deciding it — this Drop is
  that decision, now made.

## Required invariants

- The Engine remains pure/deterministic/no-I/O: `evaluate.ts` receives only the one boolean
  `hasEligibleObligationDueOrOverdue`, never an `Obligation[]`, never `classifyObligation` itself.
- Every existing kind's priority and triggering condition is byte-for-byte unchanged except
  `NO_ACTION_REQUIRED`'s `priority` field (5 → 6, a renumbering forced by the new kind occupying
  5, not a behavior change).
- `OBLIGATION_DUE` only ever fires when every higher-ranked rule (`STABILIZE`,
  `POST_SHIFT_TRANSITION`, `RECOVER`, `EXECUTE_PLANNED_WORK`) did not match.
- `DUE_SOON`/`PLANNED_TODAY` obligations never trigger `OBLIGATION_DUE` — only
  `OVERDUE`/`DUE_TODAY`, via the new, deliberately narrower `ARBITRATION_WORTHY_TIERS`.

## Acceptance criteria

- `npx tsc -b`, `npm run check:architecture`, `npx vitest run --project node`,
  `npx vitest run --project browser`, `npm run build` all pass.
- New unit tests in `tests/engine/evaluate.test.ts` prove `OBLIGATION_DUE` fires only when
  eligible and nothing higher-ranked matched, and is subordinate to every other kind.
- `tests/browser/SuitLayer01VisualGrammar.test.tsx` proves both the preserved
  ATTENTION-without-arbitration invariant (`DUE_SOON`) and the new intended behavior
  (`OVERDUE` → dominant command surface).

## Required verification

Standard ARCHITECTURAL gate per `.claude/skills/beyond-drop/SKILL.md` §3 — full `npm run verify`-
equivalent (typecheck, architecture boundaries, node + browser test projects, build), run in full
before opening the PR.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR and
stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing from
this contract and the final diff only. Specifically verify: the new priority order matches the
owner's exact ruling (bottom-of-stack, not the rejected "between POST_SHIFT_TRANSITION and
RECOVER" alternative); `evaluate.ts` never imports anything from `obligationRelevance.ts` beyond
`hasObligationRequiringArbitration`; `DUE_SOON`/`PLANNED_TODAY` obligations genuinely cannot
trigger `OBLIGATION_DUE` (not just "the tests don't cover it"); the `SuitLayer01VisualGrammar.test.tsx`
behavioral change is the correct, intended consequence of the ruling and not a masked regression.
Tagged CONFIRMED/PLAUSIBLE, never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved, reviewed,
green PR; no admin-bypass; closes `ACTIVE_DROP.md` via
`node scripts/factory-drop.mjs close INTENT-ARBITRATION-001 --integration-sha <merge-sha>` after
merge.

## Stop / escalation conditions

- Any temptation to also resolve the `COMMITMENT_DUE`/`OBLIGATION_DUE` display overlap or add a
  new handoff target — both explicitly excluded above, not authorized by this ruling.
- Any temptation to widen eligibility beyond `OVERDUE`/`DUE_TODAY` (e.g. "just include DUE_SOON
  too, it's basically the same thing") — the owner was asked this exact question and answered
  narrowly; widening it here would silently overturn that ruling.
- Any temptation to touch `persistence/compat/legacyBackup.ts` or Rated Outcome
  biasing — both out of scope.
