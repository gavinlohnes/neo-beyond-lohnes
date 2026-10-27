import { describeReason, joinWithAnd } from "./capacityCopy";
import type { ObligationRelevance } from "../../../engine/obligationRelevance";
import type { Outcome, Recommendation, RecommendationKind, StateCheckIn } from "../../../domain/common/types";
import type { RecommendationDecision, RecommendationHandoffTarget } from "../../../application/queries";

/**
 * Phase 2 (TODAY as daily command surface): plain-language wording for the
 * record/decision buttons on a recommendation. Pure strings only —
 * application/commands.ts's recordRecommendation/declineRecommendation are
 * unchanged; this file only maps their real states to words. Every
 * ACTION-kind recommendation (STABILIZE/RECOVER/EXECUTE_PLANNED_WORK) has
 * two real decisions available (accept or decline); NO_ACTION_REQUIRED has
 * exactly one (acknowledge) and no decline path.
 */

export function describeRecommendationAction(kind: RecommendationKind): string {
  return kind === "NO_ACTION_REQUIRED" ? "GOT IT" : "I'll do this";
}

export const DECLINE_LABEL = "Not doing this";

/**
 * ADVISORY-002 (owner brief 2026-10-05): the Engine titles OBLIGATION_DUE
 * "An obligation needs attention", which says nothing. TODAY never shows
 * that title: a current OBLIGATION_DUE names the commitment that fires the
 * rule (OVERDUE or DUE_TODAY), e.g. "Blood work · Overdue" (the date stays
 * on the COMMITMENT card); anywhere else it reads "A commitment was due",
 * History's label. The Engine's own title is unchanged.
 */
export const PLAIN_OBLIGATION_DUE_TITLE = "A commitment was due";

/** A recommendation's title as TODAY words it when no current commitment applies (past ones, notes). */
export function describePlainRecommendationTitle(kind: RecommendationKind, title: string): string {
  return kind === "OBLIGATION_DUE" ? PLAIN_OBLIGATION_DUE_TITLE : title;
}

export function describeRecommendationTitle(recommendation: Recommendation, headline: ObligationRelevance | null): string {
  if (recommendation.kind !== "OBLIGATION_DUE") return recommendation.title;
  // Only a commitment that fires the rule names it; after it's satisfied the next one may not be due.
  if (!headline || (headline.tier !== "OVERDUE" && headline.tier !== "DUE_TODAY")) return PLAIN_OBLIGATION_DUE_TITLE;
  return `${headline.obligation.title} · ${headline.tier === "OVERDUE" ? "Overdue" : "Due today"}`;
}

export function describeRecommendationHandoff(target: RecommendationHandoffTarget): string {
  if (target === "SHIFT_DOWN") return "GO TO SHIFT DOWN";
  if (target === "RECOVERY") return "OPEN RECOVERY ON TRAIN";
  return "OPEN WORKOUT ON TRAIN";
}

/**
 * Clarifies that tapping either button only records a decision — it never
 * starts the suggested action itself, and never changes what the Engine
 * recommends next time (same "rules provide consistency, outcomes provide
 * correction" philosophy as outcome rating — see rateOutcome). Where the
 * actual starting action lives is stated only when it's true in this
 * codebase today: SHIFT DOWN is a button in this same card; TRAIN is where
 * START WORKOUT (covering both ordinary workouts and RECOVERY sessions)
 * lives.
 */
export function describeRecommendationEffect(kind: RecommendationKind): string {
  switch (kind) {
    case "STABILIZE":
      return "Records your decision. It doesn't start SHIFT DOWN or change future advice. Start SHIFT DOWN below.";
    case "POST_SHIFT_TRANSITION":
      return "Records your decision. It doesn't start SHIFT DOWN or change future advice. Start SHIFT DOWN below.";
    case "RECOVER":
      return "Records your decision. It doesn't start a session or change future advice. Start it on TRAIN.";
    case "EXECUTE_PLANNED_WORK":
      return "Records your decision. It doesn't start your workout or change future advice. Start it on TRAIN.";
    case "OBLIGATION_DUE":
      return "Records your decision. It doesn't resolve the commitment or change future advice. Review Commitments below.";
    case "NO_ACTION_REQUIRED":
      return "Just records that you saw this. Nothing to start.";
  }
}

/** Label for the single disabled button shown once a decision has been recorded, reflecting which one it was. */
export function describeRecordedDecision(decision: RecommendationDecision): string {
  return decision === "DECLINED" ? "NOT DOING THIS — RECORDED" : "RECORDED";
}

/**
 * Product Experience Sprint, P3 (TODAY command-surface rebuild):
 * "Do not hide uncertainty/missing data. Clearly indicate when a
 * recommendation is based on limited/no check-in data." Without a
 * check-in, evaluate.ts's capacity is null and every rule falls through
 * to the same NO_ACTION_REQUIRED text a genuinely fine GREEN day would
 * also show — indistinguishable without this caveat. Purely a UI-layer
 * addition; the Engine's own rationale/trace text is untouched.
 */
export function describeEvidenceBasis(hasCheckIn: boolean): string | null {
  if (hasCheckIn) return null;
  return "No check-in yet today — this default doesn't reflect how you're actually doing. Check in below for a real read.";
}

/**
 * TODAY // SUIT LAYER 01 (DEC-003): human labels for DecisionTrace's
 * `inputs`/`derived` keys — every key engine/evaluate.ts currently
 * produces (`hasCheckIn`, `hasPlannedWork`, `capacity`, `reasonCodes`).
 * An unrecognized key falls back to itself rather than being hidden —
 * "exposed machinery" must never silently drop a real signal just
 * because this map hasn't been updated for it yet.
 */
const TRACE_KEY_LABELS: Record<string, string> = {
  hasCheckIn: "Check-in recorded",
  hasPlannedWork: "Planned work today",
  hasEligibleObligationDueOrOverdue: "Obligation overdue or due today",
  capacity: "Capacity",
  reasonCodes: "Reason codes",
  shortSleepStreak: "Two short main sleeps",
  shortSleepEvidence: "Main sleeps judged",
};

export function describeTraceLabel(key: string): string {
  return TRACE_KEY_LABELS[key] ?? key;
}

/** Booleans read as Yes/No (matching this panel's plain-language voice elsewhere); an empty string (e.g. no reasonCodes) reads as an explicit em dash rather than a blank cell. */
export function describeTraceValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === "") return "—";
  // SLEEP-ENGINE-001: the judged nights, newest first, against their usual range.
  if (typeof value === "string" && value.startsWith("[{") && value.includes('"minutes"')) {
    try {
      const clock = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
      return (JSON.parse(value) as { minutes: number; kind: string; low: number; high: number }[])
        .map((n) => `${clock(n.minutes)} (usual ${clock(n.low)}–${clock(n.high)}, ${n.kind === "WORK" ? "work day" : "day off"})`).join(" · ");
    } catch { return value; }
  }
  // CLEANUP-003 (walk-through finding 8): capacity reason codes in the same plain words TODAY uses.
  return describeReason(String(value));
}

/** CLEANUP-003 (walk-through finding 8): the Engine's selection reason, in plain words where it's a fixed phrase. */
const PLAIN_SELECTION_REASONS: Record<string, string> = {
  "No higher-priority rule matched.": "Nothing else needed attention first.",
};

export function describeSelectionReason(reason: string): string {
  return PLAIN_SELECTION_REASONS[reason] ?? reason;
}

/** Observational history only: names the recorded fact without implying that it predicts the current result. */
export function describePriorOutcomeMemory(
  decision: RecommendationDecision,
  rating: NonNullable<Outcome["rating"]>,
  issuedAt: string,
): string {
  const recordedDate = new Date(issuedAt).toLocaleDateString();
  return `Last time this recommendation was recorded (${recordedDate}): ${decision.replaceAll("_", " ")} · ${rating}`;
}

/** Display wording only; unknown/historical rationale stays verbatim. */
export function describeRecommendationReason(rationale: string): string {
  const copy: Record<string, string> = {
    "Capacity is low. Protect the basics before anything else.": "Capacity is low. Basics first. Your call.",
    "Your shift ended and hasn't been shifted down from yet.": "Work ended. Shift down when you're ready. Your call.",
    "Capacity is constrained.": "Capacity is constrained. Keep recovery in view. Your call.",
    "Capacity is good and there is planned work for today.": "Capacity is good. Your plan is ready. Your call.",
    "An obligation is overdue or due today.": "A commitment is due or overdue. Review it. Your call.",
    "No rule requires attention right now.": "Nothing needs you right now. Your call.",
  };
  return copy[rationale] ?? rationale;
}

const CHECK_IN_FIELD: Record<string, keyof Pick<StateCheckIn, "energy" | "stress" | "mood" | "soreness" | "alcoholUrge">> = {
  energy: "energy", stress: "stress", mood: "mood", soreness: "soreness", alcoholUrge: "alcoholUrge",
};

/** "energy is low (2 of 5)": the locked reason code in words, with the answer that triggered it. */
function reasonWithAnswer(code: string, checkIn: StateCheckIn | null): string {
  const field = CHECK_IN_FIELD[code.split(" ")[0] ?? ""];
  const words = describeReason(code);
  return field && checkIn ? `${words} (${checkIn[field]} of 5)` : words;
}

/**
 * DELTA-002 slice 1 (owner, 2026-10-23): "Why this?" in plain words, read only from the
 * recommendation's own DecisionTrace — never recomputed — so the explanation cannot disagree
 * with what the Engine decided. Ends by naming what the Engine does not consider, so the
 * explanation never implies sleep or weight drove it.
 */
export function explainRecommendation(recommendation: Recommendation, checkIn: StateCheckIn | null): string[] {
  const t = recommendation.trace;
  const input = (key: string) => t.inputs.find((i) => i.key === key)?.value === true;
  const capacity = t.derived.find((d) => d.key === "capacity")?.value as string | undefined;
  const codes = String(t.derived.find((d) => d.key === "reasonCodes")?.value ?? "").split(", ").filter(Boolean);
  // The answers come from the caller's check-in, not the trace (which holds no values); TODAY pairs
  // the latest check-in with the recommendation submitCheckIn wrote with it, atomically.
  const because = joinWithAnd(codes.map((code) => reasonWithAnswer(code, checkIn)));
  const capacityLine = (level: string) => because ? `Your check-in put capacity at ${level}: ${because}.` : `Your check-in put capacity at ${level}.`;
  const lines: string[] = [];
  switch (recommendation.kind) {
    case "STABILIZE":
      lines.push(capacityLine("RED"));
      // STABILIZE also hands off to SHIFT DOWN: only the rule outranks the end-of-shift rule, not the action.
      if (input("hasUnresolvedPostShift")) lines.push("Low capacity outranks the end-of-shift rule; either way, shifting down is the step.");
      break;
    case "RECOVER":
      lines.push(capacityLine("YELLOW"));
      break;
    case "POST_SHIFT_TRANSITION":
      lines.push("Your shift has ended and you haven't shifted down yet.");
      if (capacity) lines.push(`Your check-in is ${capacity}, not RED, so coming down from work comes before anything else.`);
      break;
    case "EXECUTE_PLANNED_WORK":
      lines.push("Your check-in is GREEN and you have work planned today.");
      if (input("shortSleepStreak")) lines.push(describeShortSleep(t));
      if (input("hasEligibleObligationDueOrOverdue")) lines.push("A commitment is also due; your plan comes first.");
      break;
    case "OBLIGATION_DUE":
      lines.push("A commitment is due or overdue, and nothing more urgent came first.");
      break;
    case "NO_ACTION_REQUIRED":
      lines.push(input("hasCheckIn")
        ? "Your check-in, plan, shift and commitments don't call for anything right now."
        : "No check-in yet, and your plan, shift and commitments don't call for anything.");
      break;
  }
  // SLEEP-ENGINE-001: a trace from Engine 0.2.0 on carries the sleep input; older ones never used sleep.
  lines.push(t.inputs.some((i) => i.key === "shortSleepStreak")
    ? "BEYOND decides from your check-in, plan, shift and commitments. Two short main sleeps can only make a planned session the reduced one; sleep never changes the advice itself. It doesn't use weight or training history."
    : "BEYOND decides from your check-in, plan, shift and commitments. It doesn't use sleep, weight or training history.");
  return lines;
}

/** SLEEP-ENGINE-001: "Your last two main sleeps (4:50, 5:10) were below your usual range (6:20–7:40 on work days)…", from the trace's own evidence. */
function describeShortSleep(t: Recommendation["trace"]): string {
  const clock = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  try {
    const nights = JSON.parse(String(t.inputs.find((i) => i.key === "shortSleepEvidence")?.value ?? "[]")) as { minutes: number; kind: "WORK" | "OFF"; low: number; high: number }[];
    const ranges = [...new Map(nights.map((n) => [n.kind, `${clock(n.low)}–${clock(n.high)} on ${n.kind === "WORK" ? "work days" : "days off"}`])).values()];
    if (nights.length) return `Your last two main sleeps (${[...nights].reverse().map((n) => clock(n.minutes)).join(", ")}) were below your usual range (${ranges.join("; ")}), so the reduced session is suggested. You can still choose the standard one.`;
  } catch { /* fall through to the plain sentence */ }
  return "Your last two main sleeps were below your usual range, so the reduced session is suggested. You can still choose the standard one.";
}
