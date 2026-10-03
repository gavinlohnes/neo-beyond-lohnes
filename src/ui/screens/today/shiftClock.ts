import type { SchedulePhase } from "../../../engine/scheduledContext";

/**
 * SHIFT CLOCK v1 (Drop 2, owner brief 2026-10-03): TODAY shows only what the
 * current part of the shift needs — at most MAX_PHASE_ROWS rows — and every
 * other TODAY capability sits behind one TOOLS row. Pure presentation policy,
 * the same standing as attentionPolicy.ts: it decides placement only. It
 * never decides what BEYOND recommends (engine/evaluate.ts, unchanged) or
 * what is true (application queries).
 *
 * Phases reuse the existing SchedulePhase names. They are read from the
 * BeyondDay's own lived-day window (16:30 → next 16:30) and the scheduled
 * shift that window owns, rather than from the calendar day, so a night
 * shift reads as one continuous day:
 *
 *   PRE_WORK            a work lived day, before its shift starts (16:30 → 18:00)
 *   SCHEDULED_SHIFT     during the shift (18:00 → 06:00)
 *   EXPECTED_POST_WORK  after the shift ends, or once MARK WORK ENDED is
 *                       recorded, until main sleep is logged (06:00 → main
 *                       sleep, or the 16:30 roll if no main sleep is logged)
 *   OFF                 a lived day off; and the rest of a work lived day
 *                       once main sleep is logged
 *
 * The declared work context wins over the schedule: OFF is always OFF, and a
 * WORK day the schedule doesn't cover has no times to count against, so it
 * shows the on-shift rows with no countdown. An UNKNOWN (still unanswered)
 * day never takes a phase from the schedule's prediction — it shows the
 * existing work question with the check-in and workout rows.
 */
export type ShiftClockPhase = SchedulePhase;

/**
 * Drop 1.6b (field soak, owner approval 2026-10-03): during the shift,
 * MARK WORK ENDED earns an Attention slot only in its last hour — before
 * that it sat in red at the top of TODAY for the whole night. It stays one
 * tap away in TOOLS (WORK CONTEXT) for a night that ends early.
 */
export const WORK_END_LEAD_MINUTES = 60;

export function isWorkEndDue(phase: ShiftClockPhase | null, shiftWindow: { start: Date; end: Date } | null, now: Date): boolean {
  if (phase !== "SCHEDULED_SHIFT" || !shiftWindow) return true;
  return now.getTime() >= shiftWindow.end.getTime() - WORK_END_LEAD_MINUTES * 60_000;
}

export type ShiftClockRow =
  | "WORK_QUESTION"
  | "TONIGHT"
  | "FUEL"
  | "QUICK_LOG"
  | "SHIFT_DOWN"
  | "CHECK_IN"
  | "WORKOUT"
  | "MAIN_SLEEP";

/** Everything that lives behind the TOOLS row when it isn't one of the phase's rows. */
export type ToolsItem =
  | "CHECK_IN"
  | "SHIFT_DOWN"
  | "RESET"
  | "WORK_CONTEXT"
  | "FUEL"
  | "MINIMUM_DAY"
  | "CAPTURE"
  | "COMMITMENTS"
  | "END_DAY"
  | "ADVISORY";

export const MAX_PHASE_ROWS = 4;

const PHASE_ROWS: Record<ShiftClockPhase, readonly ShiftClockRow[]> = {
  PRE_WORK: ["TONIGHT", "FUEL"],
  SCHEDULED_SHIFT: ["QUICK_LOG", "FUEL"],
  EXPECTED_POST_WORK: ["SHIFT_DOWN", "CHECK_IN", "WORKOUT", "MAIN_SLEEP"],
  OFF: ["CHECK_IN", "WORKOUT"],
};

const UNANSWERED_ROWS: readonly ShiftClockRow[] = ["WORK_QUESTION", "CHECK_IN", "WORKOUT"];

/** Tools in a fixed order; an item shown as a phase row is left out. */
export const TOOLS_ORDER: readonly ToolsItem[] = [
  "CHECK_IN",
  "SHIFT_DOWN",
  "RESET",
  "WORK_CONTEXT",
  "FUEL",
  "MINIMUM_DAY",
  "CAPTURE",
  "COMMITMENTS",
  "END_DAY",
  "ADVISORY",
];

export interface ShiftClockInput {
  now: Date;
  /** The day's work context as declared (or set from the saved schedule). */
  workContext: "WORK" | "OFF" | "UNKNOWN";
  /** The scheduled shift this lived day owns, or null on a scheduled day off. */
  shiftWindow: { start: Date; end: Date } | null;
  /** MARK WORK ENDED was recorded on this day. */
  workEnded: boolean;
  /**
   * A main (PRIMARY) sleep was logged on this day AFTER its shift ended (or
   * after MARK WORK ENDED). A main sleep logged earlier — e.g. waking after
   * 16:30, so the morning's sleep lands on the new day — must not turn the
   * coming work night into OFF; see mainSleepEndsPostShift.
   */
  mainSleepLogged: boolean;
}

export interface ShiftClockView {
  /** null while the work context is still unanswered — no phase is assumed. */
  phase: ShiftClockPhase | null;
  rows: ShiftClockRow[];
  tools: ToolsItem[];
  /** What the strip counts down to, when there's a real time to count to. */
  countdown: { kind: "SHIFT_STARTS" | "SHIFT_ENDS"; at: Date } | null;
}

export function deriveShiftClockPhase(input: ShiftClockInput): ShiftClockPhase | null {
  if (input.workContext === "UNKNOWN") return null;
  if (input.workContext === "OFF") return "OFF";
  if (input.mainSleepLogged) return "OFF";
  if (input.workEnded) return "EXPECTED_POST_WORK";
  const window = input.shiftWindow;
  if (!window) return "SCHEDULED_SHIFT";
  const now = input.now.getTime();
  if (now < window.start.getTime()) return "PRE_WORK";
  if (now < window.end.getTime()) return "SCHEDULED_SHIFT";
  return "EXPECTED_POST_WORK";
}

export function deriveShiftClockView(input: ShiftClockInput): ShiftClockView {
  const phase = deriveShiftClockPhase(input);
  const rows = [...(phase === null ? UNANSWERED_ROWS : PHASE_ROWS[phase])].slice(0, MAX_PHASE_ROWS);
  const tools = TOOLS_ORDER.filter((item) => !(rows as readonly string[]).includes(item));
  const window = input.shiftWindow;
  const countdown =
    window && phase === "PRE_WORK"
      ? { kind: "SHIFT_STARTS" as const, at: window.start }
      : window && phase === "SCHEDULED_SHIFT" && input.now.getTime() >= window.start.getTime()
        ? { kind: "SHIFT_ENDS" as const, at: window.end }
        : null;
  return { phase, rows, tools, countdown };
}

/**
 * "1h 20m" / "45m" / "1m". Rounds up to the whole minute, so the strip never
 * reads "0m" before the moment arrives.
 */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function describeCountdown(countdown: NonNullable<ShiftClockView["countdown"]>, now: Date): string {
  const left = formatCountdown(countdown.at.getTime() - now.getTime());
  return countdown.kind === "SHIFT_STARTS" ? `Shift in ${left}` : `Shift ends in ${left}`;
}

/** "B · STANDARD · ~48 min" — the duration only once Time-Fit has enough sessions to say. */
export function describePlannedWorkout(templateLabel: string, variant: string, minutes: number | undefined): string {
  return `${templateLabel} · ${variant}${minutes !== undefined ? ` · ~${minutes} min` : ""}`;
}

/** "Protein 62 / 180 g · Water 30 oz" — protein against its target when one exists; water has no target to show. */
export function describeFuel(proteinG: number, proteinTargetG: number | undefined, waterOz: number): string {
  const protein = proteinTargetG !== undefined ? `Protein ${proteinG} / ${proteinTargetG} g` : `Protein ${proteinG} g`;
  return `${protein} · Water ${waterOz} oz`;
}

/**
 * Whether any of this day's main-sleep logs (their recorded times) ends the
 * post-shift stretch: only one recorded after the shift was over — after
 * MARK WORK ENDED when recorded, otherwise after the scheduled shift end.
 * With neither known, no sleep log can end it.
 */
export function mainSleepEndsPostShift(
  mainSleepRecordedAt: readonly string[],
  workEndedAt: string | null,
  shiftWindow: { start: Date; end: Date } | null,
): boolean {
  const shiftOver = workEndedAt ? new Date(workEndedAt).getTime() : shiftWindow ? shiftWindow.end.getTime() : null;
  if (shiftOver === null) return false;
  return mainSleepRecordedAt.some((at) => new Date(at).getTime() >= shiftOver);
}

/** The quiet heading over the phase's rows. */
export function describePhaseHeading(phase: ShiftClockPhase | null, workContext: "WORK" | "OFF" | "UNKNOWN"): string {
  switch (phase) {
    case "PRE_WORK":
      return "Before shift";
    case "SCHEDULED_SHIFT":
      return "On shift";
    case "EXPECTED_POST_WORK":
      return "After shift";
    case "OFF":
      return workContext === "WORK" ? "After sleep" : "Day off";
    default:
      return "Today";
  }
}

const TOOLS_NAMES: Record<ToolsItem, string> = {
  CHECK_IN: "check-in",
  SHIFT_DOWN: "shift down",
  RESET: "reset",
  WORK_CONTEXT: "work context",
  FUEL: "fuel",
  MINIMUM_DAY: "minimum day",
  CAPTURE: "capture",
  COMMITMENTS: "commitments",
  END_DAY: "end day",
  ADVISORY: "advisory",
};

/** The closed TOOLS row's one-line summary: what's inside, so nothing feels hidden. */
export function describeToolsSummary(items: readonly ToolsItem[]): string {
  const names = items.map((item) => TOOLS_NAMES[item]);
  return names.length === 0 ? "" : names[0]!.charAt(0).toUpperCase() + names.join(", ").slice(1);
}
