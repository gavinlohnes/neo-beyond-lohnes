import { PREPARATION_LABELS, type PreparationValue } from "../../../domain/preparation";
import { formatStandardValue, isStandardTestKind, STANDARD_TEST } from "../../../domain/workout/standardTests";
import type { CheckInCorrectedPayload, DomainEvent, StateCheckIn, UrgeTrigger } from "../../../domain/common/types";
import { URGE_TRIGGER_LABELS } from "../body/quitCopy";
import { formatDuration } from "../body/bodyScreenCopy";

/** Drop 1.6a: plain names for recommendation kinds — the same titles TODAY shows. */
const RECOMMENDATION_KIND_LABELS: Record<string, string> = {
  STABILIZE: "Stabilize first",
  POST_SHIFT_TRANSITION: "Shift down after work",
  RECOVER: "Protect recovery",
  EXECUTE_PLANNED_WORK: "Proceed with planned work",
  OBLIGATION_DUE: "A commitment was due",
  NO_ACTION_REQUIRED: "No action required",
};

function kindLabel(kind: unknown): string {
  return RECOMMENDATION_KIND_LABELS[String(kind)] ?? String(kind);
}

/** "In progress · work day" — a history day's status and work context, in words. */
export function describeHistoryDayMeta(status: string, workContext: string, eventCount: number): string {
  const state = status === "ACTIVE" ? "In progress" : "Ended";
  const work = workContext === "WORK" ? "work day" : workContext === "OFF" ? "day off" : "work not set";
  return `${state} · ${work} · ${eventCount} ${eventCount === 1 ? "event" : "events"}`;
}

/** GRAYSON-FIX-UNDO-001: the log a put-back names, by the removal it takes back. */
const PUT_BACK_NAMES: Record<string, string> = {
  MEAL_LOG_VOIDED: "Meal", PROTEIN_LOG_VOIDED: "Protein", WATER_LOG_VOIDED: "Water",
  SLEEP_LOG_VOIDED: "Sleep", BODYWEIGHT_LOG_VOIDED: "Bodyweight", MEASUREMENT_LOG_VOIDED: "Measurement",
  STANDARD_TEST_VOIDED: "Standards test",
};

/**
 * Priority 1 (HISTORY screen): one-line, human-readable summary per
 * event type — purely presentational, reads the exact payload shapes
 * already confirmed in domain/common/types.ts. Never interprets or
 * changes anything; falls back to the raw type name for anything
 * unmapped so a future event type shows up as unpolished text rather
 * than silently vanishing from history.
 */
export function describeEvent(event: DomainEvent, exerciseNames: Record<string, string> = {}): string {
  const exercise = (id: unknown) => exerciseNames[String(id)] ?? String(id);
  const p = event.payload as Record<string, unknown>;
  switch (event.type) {
    case "DAY_STARTED":
      return "Day started.";
    case "DAY_ENDED":
      // DAY-ROLLOVER-001: inverted from a two-way ternary keyed on the one
      // prior auto-close reason, so a new auto-close reason (this Drop
      // added AUTO_CLOSED_DAY_ROLLOVER) is classified correctly without
      // needing another branch here every time one is added.
      return `Day ended (${p.reason === "EXPLICIT_END_DAY" ? "explicit" : "auto-closed"}).`;
    case "SLEEP_LOGGED":
      return `Sleep logged: ${formatDuration(Number(p.durationMinutes))} (${p.kind === "SUPPLEMENTAL" ? "nap" : "main sleep"}${
        p.draft === "CONFIRMED" ? ", BEYOND's draft as proposed" : p.draft === "ADJUSTED" ? ", BEYOND's draft, adjusted" : (p.source as { kind?: string } | undefined)?.kind === "GARMIN" ? ", from Garmin" : ""
      }).`;
    case "SLEEP_LOG_CORRECTED":
      return `Sleep corrected to ${formatDuration(Number(p.durationMinutes))}.`;
    case "BODYWEIGHT_LOGGED":
      return `Bodyweight logged: ${p.weightLbs} lbs.`;
    case "BODYWEIGHT_LOG_CORRECTED":
      return `Bodyweight corrected to ${p.weightLbs} lbs.`;
    case "PROTEIN_LOGGED":
      return `Protein logged: ${p.grams} g.`;
    case "PROTEIN_LOG_CORRECTED":
      return `Protein corrected to ${p.grams} g.`;
    case "WATER_LOGGED":
      return `Water logged: ${p.amountOz} oz.`;
    case "WATER_LOG_CORRECTED":
      return `Water corrected to ${p.amountOz} oz.`;
    case "MEAL_LOGGED":
      return `Meal logged: ${p.name} (${p.calories} kcal, ${p.proteinG} g protein).`;
    case "MEAL_LOG_CORRECTED":
      return `Meal corrected to ${p.calories} kcal, ${p.proteinG} g protein.`;
    case "MEAL_LOG_VOIDED":
      return "Meal log deleted.";
    case "PROTEIN_LOG_VOIDED":
      return "Protein log deleted.";
    case "WATER_LOG_VOIDED":
      return "Water log undone.";
    case "SLEEP_LOG_VOIDED":
      return "Sleep log undone.";
    case "BODYWEIGHT_LOG_VOIDED":
      return "Bodyweight log undone.";
    // GRAYSON-TRAIN-STANDARDS-001: a standards test result, and its removal (a fix is a removal plus a new result).
    case "STANDARD_TEST_RECORDED":
      return isStandardTestKind(p.test)
        ? `${STANDARD_TEST[p.test].name} ${p.correctsEventId ? "fixed to" : "test:"} ${formatStandardValue(p.test, Number(p.value))}.`
        : "Standards test recorded.";
    case "STANDARD_TEST_VOIDED":
      return "Standards test result removed.";
    // GRAYSON-FIX-UNDO-001: a removal taken back; the removal stays above it.
    case "LOG_VOID_UNDONE":
      return `${PUT_BACK_NAMES[String(p.voidedType)] ?? "Log"} log put back.`;
    case "OUTCOME_RATED":
      return `Outcome rated: ${p.rating}.`;
    case "WORK_PERIOD_ENDED":
      return "Work marked ended.";
    case "WORK_PERIOD_STARTED":
      return "Work marked started.";
    // SHIFT-CORRECT-001: explicit corrections of a work mark; the original stays above them.
    case "WORK_PERIOD_RETIMED":
      return `Shift ${p.mark === "STARTED" ? "start" : "end"} corrected to ${new Date(String(p.occurredAt)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}.`;
    case "WORK_PERIOD_VOIDED":
      return p.mark === "ENDED" ? "Shift reopened (work-ended mark removed)." : "Shift start mark removed.";
    case "LOG_RETIMED":
      return `${p.loggedType === "WATER_LOGGED" ? "Water" : p.loggedType === "MEAL_LOGGED" ? "Meal" : "Protein"} log moved to ${new Date(String(p.occurredAt)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}.`;
    case "WORK_CONTEXT_SET":
      return `Work context set to ${p.workContext} (${
        p.source === "MANUAL" ? "manual" : p.source === "SCHEDULE_STANDING" ? "per your saved schedule" : p.source === "SCHEDULE_EXCEPTION" ? "per your confirmed schedule change" : "accepted schedule suggestion"
      }).`;
    case "MINIMUM_DAY_ENABLED":
      return "Minimum Day enabled.";
    case "MEDS_COMPLETED":
      return "Meds marked done.";
    case "HYGIENE_COMPLETED":
      return "Hygiene marked done.";
    case "MOVE_COMPLETED":
      return "Move marked done.";
    case "RECOVER_CONNECT_COMPLETED":
      return p.activity ? `${p.activity === "RECOVER" ? "Recover" : "Connect"} marked done.` : "Recover/Connect marked done.";
    case "STATE_CHECKED_IN":
      return `Check-in: energy ${p.energy}, stress ${p.stress}, mood ${p.mood}, soreness ${p.soreness}, urge ${p.alcoholUrge}${
        p.draft === "CONFIRMED" ? " (BEYOND's draft, as proposed)" : p.draft === "ADJUSTED" ? " (BEYOND's draft, adjusted)" : ""
      }.`;
    // GRAYSON-CHECKIN-EDIT-001: HistoryScreen adds the before and after from the day's events (describeCheckInFix).
    case "CHECK_IN_CORRECTED":
      return "Check-in fixed.";
    case "CHECK_IN_CORRECTION_UNDONE":
      return "Check-in fix undone: the answers before it count again.";
    case "RECOMMENDATION_ISSUED":
      return `Recommendation: ${kindLabel(p.kind)}.`;
    case "RECOMMENDATION_ACCEPTED":
      return `Recommendation accepted: ${kindLabel(p.kind)}.`;
    case "RECOMMENDATION_DECLINED":
      return `Recommendation declined: ${kindLabel(p.kind)}.`;
    case "NO_ACTION_RECORDED":
      return "No action recorded.";
    case "RESET_STARTED":
      return `RESET started at intensity ${p.intensity}.`;
    case "RESET_COMPLETED":
      return "RESET completed.";
    case "RESET_CANCELLED":
      return "RESET cancelled.";
    case "SHIFT_DOWN_STARTED":
      return `SHIFT DOWN started: ${p.durationMinutes} min.`;
    case "SHIFT_DOWN_COMPLETED":
      return "SHIFT DOWN completed.";
    case "SHIFT_DOWN_CANCELLED":
      return "SHIFT DOWN cancelled.";
    case "WORKOUT_STARTED":
      return `Workout started: ${p.templateId ?? "Recovery"} ${p.sessionType}.`;
    case "WORKOUT_COMPLETED":
      return `Workout ${p.status}: ${p.sessionType}${p.durationMinutes !== undefined ? ` (${p.durationMinutes} min)` : ""}.`;
    case "WORKOUT_ABANDONED":
      return `Workout stopped: ${p.sessionType}${p.durationMinutes !== undefined ? ` (${p.durationMinutes} min)` : ""}.`;
    case "SET_LOGGED":
      return `Set logged: ${exercise(p.exerciseId)}${p.substitutedName ? ` (as ${p.substitutedName})` : ""} #${p.setNumber} — ${p.weight} lb x ${p.reps}.`;
    case "SET_SKIPPED":
      return `Set skipped: ${exercise(p.exerciseId)} #${p.setNumber}.`;
    case "PREPARATION_RECORDED":
      return `Preparation · ${p.item === "FOOD" ? "Food and snacks" : "Bottle"}: ${PREPARATION_LABELS[p.value as PreparationValue] ?? "Unknown"}.`;
    case "MEMORY_RECORDED":
      return `Memory · ${String(p?.action ?? "recorded").toLowerCase()} · ${String(p?.statement ?? "Unreadable statement")} · ${String(p?.status ?? "unknown status")} · ${event.source === "USER" ? "OPERATOR" : event.source}.`;
    case "LEARNING_RESPONDED":
      return `Delta's learning · ${({ KEEP: "kept", NARROW: "narrowed", NOT_TRUE: "marked not true", DROP: "dropped", UNDO: "answer undone" } as Record<string, string>)[String(p?.action)] ?? "answered"} · ${String(p?.statement ?? "Unreadable statement")}.`;
    case "HABIT_LADDER_ANSWERED":
      return `Habit check-in · ${String(p?.habitName ?? "a habit")} · ${({ ASK: "what got in the way", NAME: "the pattern", CHALLENGE: "the challenge", EXAMINE: "the plan" } as Record<string, string>)[String(p?.stage)] ?? "answered"}: ${({ SHIFT: "shift or work ran over", TIRED: "too tired or recovering", FORGOT: "forgot", DIDNT_FEEL: "didn't feel like it", PLAN: "the plan doesn't fit", OTHER: "something else", RIGHT: "that's right", NOT_RIGHT: "not right", CHANGE_PLAN: "change the plan", START_SMALLER: "start smaller", KEEP: "keep it as it is", LATER: "later" } as Record<string, string>)[String(p?.answer)] ?? "answered"}.`;
    case "WEEKLY_REVIEW_SAVED":
      return `Weekly review ${p?.supersedes ? "revised" : "saved"} for ${String(p?.weekStart ?? "unknown week")}. Note: ${String(p?.note || "None")}. Focus: ${String((p?.focus as { text?: unknown } | null)?.text ?? "None chosen")}.`;
    case "CLEAN_DAY_LOGGED":
      return `Clean day logged${p.habitName ? `: ${p.habitName}` : ""}.`;
    case "URGE_LOGGED":
      return `Urge logged${p.trigger ? ` (${URGE_TRIGGER_LABELS[p.trigger as UrgeTrigger] ?? p.trigger})` : ""}.`;
    case "URGE_UNDONE":
      return "Urge log undone.";
    case "TIME_CAPSULE_SEALED":
      return `Time capsule sealed (opens ${p.opensOn}).`;
    case "TIME_CAPSULE_OPENED":
      return "Time capsule opened.";
    case "SHIFT_HANDOFF_NOTED":
      return `Note for next shift: ${p.note}`;
    case "SHIFT_HANDOFF_READ":
      return "Shift note read.";
    case "TRAIN_PROGRAM_SET":
      return p.programme === null ? "Training programme cleared." : "Training programme saved.";
    case "EXERCISE_CUE_SET":
      return `${p.cue ? "Cue set" : "Cue cleared"}: ${exercise(p.exerciseId)}.`;
    case "URGE_PLAN_RESPONDED":
      return `Urge plan ${p.used ? "used" : "not used this time"}${p.trigger ? ` (${URGE_TRIGGER_LABELS[p.trigger as UrgeTrigger] ?? p.trigger})` : ""}.`;
    // ROUTINES-001 (review of #357, L2): plain words, no counting.
    case "ROUTINE_STEP_SET":
      return p.done ? "Routine step ticked." : "Routine step unticked.";
    default:
      return event.type;
  }
}

const CHECK_IN_LABELS = [["energy", "energy"], ["stress", "stress"], ["mood", "mood"], ["soreness", "soreness"], ["alcoholUrge", "urge"]] as const;

/**
 * GRAYSON-CHECKIN-EDIT-001: "Check-in fixed: energy 2 → 4." The before comes from the row the fix superseded, found in
 * the same day's events; falls back to the fixed answers alone if that row isn't there.
 */
export function describeCheckInFix(event: DomainEvent, dayEvents: readonly DomainEvent[]): string {
  const { supersedesCheckInId, checkIn: after } = event.payload as CheckInCorrectedPayload;
  let before: StateCheckIn | undefined;
  for (const e of dayEvents) {
    if (e.type === "STATE_CHECKED_IN" && (e.payload as StateCheckIn).id === supersedesCheckInId) before = e.payload as StateCheckIn;
    if (e.type === "CHECK_IN_CORRECTED" && (e.payload as CheckInCorrectedPayload).checkIn.id === supersedesCheckInId) before = (e.payload as CheckInCorrectedPayload).checkIn;
  }
  if (!before) return `Check-in fixed: ${CHECK_IN_LABELS.map(([key, label]) => `${label} ${after[key]}`).join(", ")}.`;
  const changed = CHECK_IN_LABELS.filter(([key]) => before[key] !== after[key]).map(([key, label]) => `${label} ${before[key]} → ${after[key]}`);
  return changed.length ? `Check-in fixed: ${changed.join(", ")}.` : "Check-in fixed.";
}
