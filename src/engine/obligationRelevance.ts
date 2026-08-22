import type { Obligation } from "../domain/intent/types";

/**
 * Intent & Commitment Spine — Drop 02 (approved 2026-08-22, temporal
 * corrections binding). Pure, deterministic interpretation of already-true
 * Obligation facts into a TEMPORARY relevance classification — nothing
 * here is ever persisted. This is a parallel interpretation layer, not an
 * extension of engine/evaluate.ts: it has no knowledge of Recommendation,
 * capacity, or check-ins, and evaluate.ts/EvaluateInput must never import
 * from this module (see the Engine Boundary rule this Drop is bound by —
 * Obligations do not yet participate in primary recommendation
 * arbitration).
 *
 * Deliberately duplicates a tiny local tie-break instead of importing
 * application/queries.ts's byTimeThenSeq — engine/* modules must stay
 * freely unit-testable with zero I/O (no fake-indexeddb needed), and
 * application/queries.ts transitively imports persistence/db.ts (a
 * module with a real top-level side effect: `export const db = new
 * BeyondDB()`). Crossing that boundary for one 4-line comparator would
 * undermine that property for every future engine/* module, not just
 * this one.
 */

export type ObligationRelevanceTier = "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "PLANNED_TODAY" | "WAITING" | "QUIET";

/**
 * Locked Drop 02 product ruling (2026-08-22): a 2-calendar-day forward
 * window, meaning tomorrow and the day after — today itself is DUE_TODAY,
 * never folded into this window.
 */
const DUE_SOON_WINDOW_DAYS = 2;

/**
 * Calendar-day difference (to - from), computed via local midnight
 * Date objects rather than raw millisecond subtraction of the two ISO
 * strings, so a DST transition (a 23- or 25-hour "day" in the runtime's
 * local timezone) still rounds to the correct whole-day count. YYYY-MM-DD
 * parsing via new Date(y, m-1, d) correctly rolls over month/year
 * boundaries (Date's own constructor semantics), so Dec 31 -> Jan 1 and
 * Feb 28/29 -> Mar 1 need no special-casing here.
 */
function daysBetween(fromDateOnly: string, toDateOnly: string): number {
  const [fy, fm, fd] = fromDateOnly.split("-").map(Number);
  const [ty, tm, td] = toDateOnly.split("-").map(Number);
  const fromMs = new Date(fy!, fm! - 1, fd!).getTime();
  const toMs = new Date(ty!, tm! - 1, td!).getTime();
  return Math.round((toMs - fromMs) / 86_400_000);
}

/**
 * Locked Drop 02 temporal rule (binding product ruling, 2026-08-22):
 *
 *   status WAITING             -> WAITING, unconditionally (regardless of
 *                                  dueAt/plannedAt — narrow and intentional
 *                                  for this Drop; see doc comment below)
 *   dueAt < today               -> OVERDUE
 *   dueAt === today             -> DUE_TODAY (never OVERDUE — BEYOND only
 *                                  possesses a date, not a due-time
 *                                  instant, so claiming "overdue" during
 *                                  the due date itself would assert
 *                                  precision the canonical record doesn't
 *                                  contain)
 *   dueAt is tomorrow or the    -> DUE_SOON
 *     day after tomorrow
 *   plannedAt === today, and    -> PLANNED_TODAY
 *     no stronger due
 *     classification applies
 *   otherwise                   -> QUIET
 *
 * WAITING is checked first and wins unconditionally, even over a past
 * dueAt — "should not behave like immediately actionable OPEN obligations"
 * (Drop 02 product ruling). Deliberately narrow: a future capability may
 * interpret a stale WAITING obligation, but Drop 02 does not.
 */
export function classifyObligation(obligation: Obligation, today: string): ObligationRelevanceTier {
  if (obligation.status === "WAITING") return "WAITING";

  if (obligation.dueAt) {
    const diff = daysBetween(today, obligation.dueAt);
    if (diff < 0) return "OVERDUE";
    if (diff === 0) return "DUE_TODAY";
    if (diff >= 1 && diff <= DUE_SOON_WINDOW_DAYS) return "DUE_SOON";
  }

  if (obligation.plannedAt === today) return "PLANNED_TODAY";

  return "QUIET";
}

export interface ObligationRelevance {
  obligation: Obligation;
  tier: ObligationRelevanceTier;
}

/**
 * Fixed, non-configurable ranking (locked Drop 02 product ruling,
 * 2026-08-22) — not a generalized/extensible priority engine. Explicitly:
 * OVERDUE > DUE_TODAY > DUE_SOON > PLANNED_TODAY > WAITING > QUIET.
 */
const TIER_RANK: Record<ObligationRelevanceTier, number> = {
  OVERDUE: 0,
  DUE_TODAY: 1,
  DUE_SOON: 2,
  PLANNED_TODAY: 3,
  WAITING: 4,
  QUIET: 5,
};

/** Mirrors application/queries.ts's byTimeThenSeq exactly — see this file's top doc comment for why it's duplicated rather than imported. */
function byTimeThenSeq(timeA: string, seqA: number | undefined, timeB: string, seqB: number | undefined): number {
  const byTime = timeA.localeCompare(timeB);
  if (byTime !== 0) return byTime;
  return (seqA ?? 0) - (seqB ?? 0);
}

/**
 * The single explicit ranking rule Drop 02 needs — not a scored/weighted
 * priority engine. Ties within the same tier break by soonest dueAt
 * first (a real obligation with a date), then the app's established
 * creation-order tie-break (byTimeThenSeq on createdAt/seq) for anything
 * still equal, e.g. two QUIET obligations with no dueAt at all.
 */
export function getMostRelevantUnresolvedObligation(
  obligations: Obligation[],
  today: string,
): ObligationRelevance | null {
  if (obligations.length === 0) return null;

  const classified = obligations.map((obligation) => ({ obligation, tier: classifyObligation(obligation, today) }));

  classified.sort((a, b) => {
    const rankDiff = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    if (rankDiff !== 0) return rankDiff;

    const dueA = a.obligation.dueAt;
    const dueB = b.obligation.dueAt;
    if (dueA && dueB && dueA !== dueB) return dueA < dueB ? -1 : 1;
    if (dueA && !dueB) return -1;
    if (!dueA && dueB) return 1;

    return byTimeThenSeq(a.obligation.createdAt, a.obligation.seq, b.obligation.createdAt, b.obligation.seq);
  });

  return classified[0]!;
}

/**
 * Locked Drop 02 attention gate: OVERDUE, DUE_TODAY, DUE_SOON, and
 * PLANNED_TODAY may earn TODAY's scarce ATTENTION slot; WAITING and QUIET
 * never do (product ruling, 2026-08-22 — PLANNED_TODAY earns attention
 * because it's the operator's own authored intention for today, not
 * BEYOND overriding their sovereignty; WAITING is excluded even past its
 * dueAt, deliberately narrow for this Drop).
 */
const ATTENTION_WORTHY_TIERS: ReadonlySet<ObligationRelevanceTier> = new Set([
  "OVERDUE",
  "DUE_TODAY",
  "DUE_SOON",
  "PLANNED_TODAY",
]);

export function hasObligationRequiringAttention(obligations: Obligation[], today: string): boolean {
  return obligations.some((obligation) => ATTENTION_WORTHY_TIERS.has(classifyObligation(obligation, today)));
}

/**
 * Suit Layer 01 — Visual System Hardening (2026-08-22): exposes the same
 * attention-worthy check per single tier, for presentation code (TODAY's
 * Commitments card) that needs to style one already-classified
 * Obligation by real urgency rather than by whether it happened to win
 * TODAY's scarce 2-slot ATTENTION cap. Pure re-export of the existing
 * set — no new classification logic.
 */
export function isAttentionWorthyTier(tier: ObligationRelevanceTier): boolean {
  return ATTENTION_WORTHY_TIERS.has(tier);
}
