/**
 * TIMEBOX-001 (Gavin, 2026-11-18: "Go"): an optional time estimate he types on a task, in whole minutes.
 * Pure helpers shared by the screens: read the hours + minutes form, say an estimate, and total the estimates he
 * entered for a list of tasks. BEYOND never invents an estimate, never treats a missing one as zero, and never turns a
 * total into free time, capacity or a "full" day. Estimates only: no timer, no actual-vs-estimate, no auto-moving.
 */
export const ESTIMATE_MIN_MINUTES = 1;
export const ESTIMATE_MAX_MINUTES = 480;

export interface EstimateForm {
  hours: string;
  minutes: string;
}
export const EMPTY_ESTIMATE: EstimateForm = { hours: "", minutes: "" };

export function estimateFormFor(minutes: number | undefined): EstimateForm {
  if (minutes === undefined) return EMPTY_ESTIMATE;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return { hours: h ? String(h) : "", minutes: m ? String(m) : "" };
}

export type EstimateRead = { ok: true; minutes: number | null } | { ok: false; message: string };

const WHOLE = /^\d+$/;
/** Both boxes blank = no estimate (null). Whole numbers only; the total must be 1 minute to 8 hours. */
export function readEstimateForm(form: EstimateForm): EstimateRead {
  const hours = form.hours.trim(), minutes = form.minutes.trim();
  if (!hours && !minutes) return { ok: true, minutes: null };
  if ((hours && !WHOLE.test(hours)) || (minutes && !WHOLE.test(minutes))) {
    return { ok: false, message: "Use whole hours and minutes, like 1 h 30 min." };
  }
  const total = Number(hours || 0) * 60 + Number(minutes || 0);
  if (total < ESTIMATE_MIN_MINUTES || total > ESTIMATE_MAX_MINUTES) {
    return { ok: false, message: "An estimate is 1 minute to 8 hours." };
  }
  return { ok: true, minutes: total };
}

export function isValidEstimateMinutes(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= ESTIMATE_MIN_MINUTES && value <= ESTIMATE_MAX_MINUTES;
}

/** 45 → "45 min", 60 → "1 h", 90 → "1 h 30 min". */
export function formatEstimate(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
}

export interface EstimateTotal {
  /** Sum of the estimates he entered; tasks without one add nothing (never counted as zero time). */
  minutes: number;
  withTime: number;
  of: number;
}
export function estimateTotal(tasks: readonly { estimateMinutes?: number }[]): EstimateTotal {
  const timed = tasks.filter((t) => isValidEstimateMinutes(t.estimateMinutes));
  return { minutes: timed.reduce((sum, t) => sum + t.estimateMinutes!, 0), withTime: timed.length, of: tasks.length };
}

/** "Your estimates: 1 h 15 min · 2 of 3 tasks have a time." Null when there are no tasks to total. */
export function estimateTotalLine(tasks: readonly { estimateMinutes?: number }[]): string | null {
  const total = estimateTotal(tasks);
  if (!total.of) return null;
  const count = `${total.withTime} of ${total.of} ${total.of === 1 ? "task has" : "tasks have"} a time`;
  return total.withTime ? `Your estimates: ${formatEstimate(total.minutes)} · ${count}.` : `No time estimates yet · ${count}.`;
}
