import { db } from "../persistence/db";
import { byTimeThenSeq, walkCorrectionChain } from "./queries";

/**
 * Drop 5 (owner approval 2026-09-30; ROADMAP 1.0 rulings allow bodyweight
 * trends, milestones and a projected goal date). Everything here is derived
 * from logged weigh-ins — nothing is stored, nothing feeds the Engine, and
 * the wording stays adherence-neutral: facts and trends, never shame. A
 * trend moving away from the goal simply gets no projection and no warning.
 */
export interface WeighIn {
  recordedAt: string;
  weightLbs: number;
}

/** Every weigh-in across all days, oldest first, at its effective (corrected) value. */
export async function getBodyweightHistory(): Promise<WeighIn[]> {
  const [logged, corrections] = await Promise.all([
    db.events.where("type").equals("BODYWEIGHT_LOGGED").toArray(),
    db.events.where("type").equals("BODYWEIGHT_LOG_CORRECTED").toArray(),
  ]);
  return logged
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq))
    .map((root) => {
      const payload = root.payload as { weightLbs: number };
      const chain = walkCorrectionChain(corrections, root.id, payload.weightLbs, "weightLbs");
      return { recordedAt: root.recordedAt, weightLbs: chain.effectiveValue };
    });
}

export type TrendDirection = "LOSE" | "GAIN";

const DAY_MS = 24 * 60 * 60 * 1000;
const time = (w: WeighIn) => new Date(w.recordedAt).getTime();

/** Losing unless a goal above the first weigh-in says otherwise. */
export function trendDirection(history: readonly WeighIn[], goalWeightLbs?: number): TrendDirection {
  const first = history[0];
  return goalWeightLbs !== undefined && first !== undefined && goalWeightLbs > first.weightLbs ? "GAIN" : "LOSE";
}

/**
 * "Lowest since Aug 12" (or "highest since" when gaining): the last earlier
 * weigh-in at or beyond the latest one, when that was at least two weeks
 * back. "Lowest yet" when no earlier weigh-in was as low. Undefined when
 * it isn't notable (too recent, or only one weigh-in).
 */
export function describeBestSince(history: readonly WeighIn[], direction: TrendDirection): string | undefined {
  const latest = history.at(-1);
  if (!latest || history.length < 2) return undefined;
  const beats = (earlier: WeighIn) =>
    direction === "LOSE" ? earlier.weightLbs <= latest.weightLbs : earlier.weightLbs >= latest.weightLbs;
  const word = direction === "LOSE" ? "Lowest" : "Highest";
  for (let i = history.length - 2; i >= 0; i--) {
    const earlier = history[i]!;
    if (!beats(earlier)) continue;
    if (time(latest) - time(earlier) < 14 * DAY_MS) return undefined;
    return `${word} since ${formatShortDate(earlier.recordedAt)}`;
  }
  return `${word} yet`;
}

/** "Down 10 lb since Jul 3": whole 5-lb steps moved toward the goal direction since the first weigh-in. */
export function describeMilestone(history: readonly WeighIn[], direction: TrendDirection): string | undefined {
  const first = history[0];
  const latest = history.at(-1);
  if (!first || !latest || history.length < 2) return undefined;
  const moved = direction === "LOSE" ? first.weightLbs - latest.weightLbs : latest.weightLbs - first.weightLbs;
  const step = Math.floor(moved / 5) * 5;
  if (step < 5) return undefined;
  return `${direction === "LOSE" ? "Down" : "Up"} ${step} lb since ${formatShortDate(first.recordedAt)}`;
}

export type GoalProjection =
  | { kind: "REACHED" }
  | { kind: "DATE"; date: Date }
  | { kind: "NONE" };

/**
 * Projected goal date from the last four weeks of weigh-ins (least-squares
 * line). Needs at least 5 weigh-ins spanning at least 14 days, and a trend
 * actually heading toward the goal; otherwise NONE, with nothing said.
 */
export function projectGoalDate(history: readonly WeighIn[], goalWeightLbs: number | undefined): GoalProjection {
  const latest = history.at(-1);
  if (goalWeightLbs === undefined || !latest) return { kind: "NONE" };
  const direction = trendDirection(history, goalWeightLbs);
  const remaining = direction === "LOSE" ? latest.weightLbs - goalWeightLbs : goalWeightLbs - latest.weightLbs;
  if (remaining <= 0) return { kind: "REACHED" };

  const end = time(latest);
  const recent = history.filter((w) => end - time(w) <= 28 * DAY_MS);
  if (recent.length < 5 || end - time(recent[0]!) < 14 * DAY_MS) return { kind: "NONE" };

  const xs = recent.map((w) => (time(w) - end) / DAY_MS);
  const ys = recent.map((w) => w.weightLbs);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  if (den === 0) return { kind: "NONE" };
  const slope = num / den; // lb per day
  const towardGoal = direction === "LOSE" ? -slope : slope;
  if (towardGoal < 0.01) return { kind: "NONE" };

  const fittedNow = meanY + slope * (0 - meanX);
  const fittedRemaining = direction === "LOSE" ? fittedNow - goalWeightLbs : goalWeightLbs - fittedNow;
  if (fittedRemaining <= 0) return { kind: "NONE" };
  const days = fittedRemaining / towardGoal;
  if (days > 3 * 365) return { kind: "NONE" };
  return { kind: "DATE", date: new Date(end + days * DAY_MS) };
}

export function formatShortDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
