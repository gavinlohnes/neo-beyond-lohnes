---
id: FOUNDATION-1B
baseline: 2d3cad34645afed52d43a65b1a4be223cbc7bf77
risk_tier: ARCHITECTURAL
---

# FOUNDATION-1B // OPERATIONAL CONTINUITY

## Mission

Move BEYOND toward answering "what matters right now?" by formalizing three things the
existing architecture already implies but doesn't yet name or complete: a TIME state broader
than the work schedule, a Continuity Engine that resolves yesterday's unfinished facts into
DROP/DEFER/REINTRODUCE instead of letting them silently roll forward, and a formal three-level
Attention Authority (QUIET/SURFACE/INTERRUPT) that the existing `Recommendation` +
`AdvisoryNote` split already approximates. Deliver the six required behavioral acceptance
scenarios (A–F) as regression-tested behavior, per direct owner authorization (this session,
2026-09-20) and the resolved PROTECT-vs-EXECUTE question below.

## Approved baseline

`origin/master` at `2d3cad34645afed52d43a65b1a4be223cbc7bf77`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-09-20 (FOUNDATION-1A's closure
commit).

## Risk classification

ARCHITECTURAL. Triggers: new `src/engine/**` modules (continuity classification, day-phase
derivation, attention-level formalization) and a `domain/intelligence/types.ts` shape addition
(attention level on `AdvisoryNote`). Explicitly NOT High-Risk: no persistence schema/migration,
no backup/restore contract change, no correction-model change, no protected-fixture touch, no
new runtime dependency. Explicitly NOT a further Engine-priority change: `evaluate.ts`'s
`RecommendationKind` set, ranking, and trace shape are unchanged by this Drop — see the resolved
conflict below.

## Resolved conflict — PROTECT vs EXECUTE (read before touching evaluate.ts)

Investigation found that FOUNDATION-1B's `STABILIZE → PROTECT → RECOVER → EXECUTE → OPTIONAL`
hierarchy and Scenario B ("PROTECT outranks EXECUTE") conflict with the locked
`docs/UX_DECISIONS.md` "INTENT-ARBITRATION-001" entry (2026-09-15), which ranks the closest
existing analogue — `OBLIGATION_DUE` — below `EXECUTE_PLANNED_WORK` and records that the owner
"explicitly rejected" ranking it higher. Presented to the owner directly (this session,
2026-09-20); **resolved as Advisory-only PROTECT**: `evaluate.ts`'s locked kind set and ranking
stay exactly as INTENT-ARBITRATION-001 left them. A shift-protection concern (or any other
PROTECT-shaped fact) surfaces as an INTERRUPT/SURFACE-tier `AdvisoryNote` alongside whatever
`evaluate.ts` selected as primary (typically `EXECUTE_PLANNED_WORK`) — it never becomes a
competing Engine kind and never changes which kind is primary. This is the binding resolution
for this Drop; a future Drop would need its own fresh owner ruling to reopen it.

## Authorized scope

- **TIME**: a new pure day-phase module deriving a broader time state (wake / pre-shift /
  on-shift / post-shift / wind-down / sleep-window / off-day) from existing evidence
  (`SchedulePattern`/`scheduledContext.ts`'s existing shift math, plus the latest PRIMARY
  `SLEEP_LOGGED` fact for wake/sleep-window edges) — additive, no schema change, no
  `BeyondDay`/`StateCheckIn` field change.
- **CONTINUITY ENGINE**: a new pure module classifying an unresolved prior-day fact (a
  DECLINED or un-recorded prior `Recommendation`, an unfinished Minimum Day item) into
  DROP / DEFER / REINTRODUCE at the next relevant decision point (day start / check-in).
  Advisory-tier only for this Drop — composes into `AdvisoryNote` via `engine/advisory.ts`'s
  existing one-way producer pattern; never an `evaluate.ts` input, per the resolved conflict
  above and per the brief's own "do not overbuild" instruction. Enforces NO_CATCH_UP: nothing
  it produces creates an obligation-shaped debt.
- **ATTENTION AUTHORITY**: formalize QUIET / SURFACE / INTERRUPT as a real type; classify
  existing `AdvisoryNote`s as QUIET by default, the Engine's primary `Recommendation` as
  SURFACE, and define narrow, evidence-gated criteria for the rare INTERRUPT tier (used only by
  the new PROTECT-shaped advisory notes above). INTERRUPT remains advisory — it still never
  executes, blocks, or bypasses user decision.
- **RECOMMENDATION LIFECYCLE**: add a "materially new evidence" gate so a DECLINED
  recommendation's identical inputs (unchanged capacity/hasPlannedWork/hasUnresolvedPostShift/
  hasEligibleObligationDueOrOverdue) don't silently regenerate an identical fresh recommendation
  on the next check-in; add explicit, read-time-derived SUPERSEDED/EXPIRED disposition (reusing
  `getRecommendationDecision`/`getPriorOutcomeMemory`, no new stored field) for REVIEW's ledger.
- **OUTCOME FEEDBACK**: present the existing `Outcome.rating` (GOOD/NEUTRAL/BAD, already
  observational, already locked non-biasing) using BETTER/SAME/WORSE product-language copy
  where a prior same-kind outcome exists for comparison; "SKIP" is the existing "leave it
  unrated" path. No new stored vocabulary, no schema change.
- Six behavioral acceptance scenarios (A–F) as automated regression coverage.
- Record this Drop Contract, activate it via `scripts/factory-drop.mjs`, and add the
  corresponding `docs/UX_DECISIONS.md` entries for anything newly locked.

## Explicit exclusions

- No change to `evaluate.ts`'s `RecommendationKind` set, ranking, or trace shape — see the
  resolved conflict above. No new Engine recommendation kind of any name.
- No change to `capacity.ts`'s locked GREEN/YELLOW/RED rule.
- No persistence schema/migration, backup/restore contract, or correction-model change.
- No pattern-detection/learning-layer machinery beyond a single, non-persistent, non-automatic
  "surface a proposal" read for Scenario F — no scoring, no silent plan/doctrine/threshold
  mutation, no scheduled/background job, nothing that could be read as the "AI/learning layer
  over workout data" the README's "Explicitly out of scope" section excludes.
- No new runtime dependency.
- No TODAY/TRAIN/BODY/MORE primary navigation change; no new screen — new state surfaces
  through existing TODAY advisory/WHY-trace/REVIEW presentation only.
- No change to Mission/Obligation semantics, `obligationRelevance.ts`'s classification/ranking,
  or `obligationEligibility.ts`.
- No gamification: no score, streak, badge, or engagement metric anywhere in this Drop.

## Relevant authority / references

- Direct owner authorization for FOUNDATION-1B (this session, 2026-09-20), including the
  resolved PROTECT-vs-EXECUTE ruling above.
- `docs/UX_DECISIONS.md`'s FOUNDATION-1A pillars/guarantees section (USER_DECIDES, NO_CATCH_UP,
  REDUCE_BEFORE_SKIP, ONE_PRIMARY_RECOMMENDATION, MANUAL_INPUT_ALWAYS_AVAILABLE,
  AI_CANNOT_SILENTLY_CHANGE_PLANS, ENJOYMENT_COUNTS, BEYOND_MAY_DO_LESS, NO_FAKE_PRECISION) —
  all preserved, none reinterpreted.
- `docs/UX_DECISIONS.md`'s "INTENT-ARBITRATION-001" and "Recommendation Engine — outcome
  ratings stay observational" entries — both left exactly as locked.
- `.claude/rules/engine.md` — `advisory.ts`'s one-way-dependency contract this Drop's new
  Continuity/Attention producers must follow.
- `OPERATOR_INTERFACE_DOCTRINE.md` — Attention states test (four questions before escalating),
  "No guilt mechanics," "Measure operator burden—not engagement."
- README.md "Explicitly out of scope" — no AI/learning layer over workout data.

## Required invariants

- `evaluate.ts` remains the sole primary-Recommendation arbiter, unchanged in kind set,
  ranking, and purity (no new import from `application/*` or `persistence/*`).
- `AdvisoryNote` remains informational-only: no `priority`, no `suggestedCommand`, never
  accepted/declined/executed, never an `evaluate.ts` input. The one-way dependency
  (`advisory.ts`/producers may import `evaluate.ts` types/`obligationRelevance.ts`/
  `progression.ts`; none of those import back) is regression-tested, matching the existing
  `advisory.test.ts` pattern.
- Every new Continuity/TIME/Attention module is pure: same inputs → same output, no I/O, no
  module-level mutable state, unit-testable without `fake-indexeddb`.
- NO_CATCH_UP holds mechanically: nothing DROP/DEFER/REINTRODUCE produces can be mistaken for a
  new obligation, and REINTRODUCE never auto-executes or silently reopens history.
- ONE_PRIMARY_RECOMMENDATION holds: TODAY still surfaces exactly one primary Recommendation;
  PROTECT/Continuity content is presented as a clearly secondary/advisory element, never a
  second competing primary.
- A DISMISSED (DECLINED) recommendation does not regenerate an identical fresh one from
  unchanged evidence on the very next check-in.
- Existing `tests/integration/stabilizationRegressionSuite.test.ts` and the full existing suite
  stay green — nothing here weakens prior Drop behavior.

## Acceptance criteria

- `tests/integration/foundationContinuity.test.ts` (or equivalently named) covers Scenarios
  A–F end to end, each as an explicit, named test.
- New unit tests exist for each new pure engine module (day-phase, continuity classification,
  attention-level composition) at the same rigor as `tests/engine/obligationRelevance.test.ts`.
- `docs/UX_DECISIONS.md` gains locked entries for: the TIME day-phase extension, the Continuity
  Engine's DROP/DEFER/REINTRODUCE rule, the Attention Authority levels, the recommendation
  "materially new evidence" gate, and the resolved PROTECT-vs-EXECUTE disposition — each citing
  real file/section evidence, matching FOUNDATION-1A's own reconciliation style.
- `npm run verify` passes (architecture boundaries, full Vitest suite, production build).
- `git diff --check` clean; `npm run check:risk 2d3cad34645afed52d43a65b1a4be223cbc7bf77`
  confirms the diff stays inside the Engine/domain/UI/docs buckets this contract declares — no
  persistence/dependency/protected-fixture surprise.

## Required verification

Standard Architectural gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && npm run build`), plus `git diff --check` and
`npm run check:risk 2d3cad34645afed52d43a65b1a4be223cbc7bf77`.

## Builder expectations

- Work only on `claude/foundation-1b-continuity-3pnf5y`, cut from the exact baseline above.
- Implement exactly the authorized scope; treat any temptation to touch `evaluate.ts`'s kind
  set/ranking as a STOP condition already resolved against doing so, not a judgment call.
- Run the required verification, commit, push, and report — do not merge, do not open a
  further Drop.

## Reviewer expectations

- A separate session reviews this contract plus the final diff.
- Checks the one-way `advisory.ts` dependency boundary, `evaluate.ts` purity/unchanged kind
  set, NO_CATCH_UP/ONE_PRIMARY_RECOMMENDATION preservation, and that every new locked
  `docs/UX_DECISIONS.md` entry is evidence-backed.
- Persists exact-head-bound review evidence; never merges or expands scope unilaterally.

## Integrator expectations

- A separate, explicitly authorized session merges only an approved, green PR/head.
- No admin-bypass of any required check.
- After merge, close FOUNDATION-1B via `node scripts/factory-drop.mjs close FOUNDATION-1B
  --integration-sha <merge-commit-sha>`; this contract file is never rewritten by closure.

## Stop / escalation conditions

- Any temptation to change `evaluate.ts`'s `RecommendationKind` set, ranking, or trace shape —
  already resolved against for this Drop; a genuine new need here stops and returns to the
  owner rather than being treated as in-scope.
- Any temptation toward persisted scoring, silent plan/threshold mutation, or background/
  scheduled pattern-detection beyond Scenario F's single non-persistent proposal read.
- `origin/master` differs from the approved baseline at any point verification is re-run.
- Another Drop becomes ACTIVE concurrently.
