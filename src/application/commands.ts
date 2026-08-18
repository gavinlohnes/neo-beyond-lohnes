import { db } from "../persistence/db";
import { evaluate } from "../engine/evaluate";
import type {
  BeyondDay,
  DomainEvent,
  Recommendation,
  StateCheckIn,
} from "../domain/common/types";

function newId(): string {
  return crypto.randomUUID();
}

export async function startDay(): Promise<BeyondDay> {
  const now = new Date().toISOString();
  const day: BeyondDay = {
    id: newId(),
    startedAt: now,
    timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    workContext: "UNKNOWN",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  await db.beyondDays.add(day);
  await logEvent(day.id, "DAY_STARTED", { dayId: day.id }, "USER", newId());
  return day;
}

export async function submitCheckIn(
  beyondDayId: string,
  values: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">,
): Promise<{ checkIn: StateCheckIn; recommendation: Recommendation }> {
  const checkIn: StateCheckIn = {
    id: newId(),
    beyondDayId,
    recordedAt: new Date().toISOString(),
    ...values,
  };
  const correlationId = newId();
  await db.checkIns.add(checkIn);
  await logEvent(beyondDayId, "STATE_CHECKED_IN", checkIn, "USER", correlationId);

  // Engine reassesses immediately after new evidence. Issuing a
  // recommendation is automatic; RECORDING it (accept / no-action) is a
  // separate, explicit user step — see recordRecommendation below.
  const recommendation = evaluate({
    beyondDayId,
    checkIn,
    hasPlannedWork: false,
  });
  await db.recommendations.add(recommendation);
  await logEvent(
    beyondDayId,
    "RECOMMENDATION_ISSUED",
    { recommendationId: recommendation.id, kind: recommendation.kind },
    "ENGINE",
    correlationId,
  );

  return { checkIn, recommendation };
}

/**
 * Explicit user confirmation that a recommendation was seen and is being
 * committed to history — either as an accepted action, or, for
 * NO_ACTION_REQUIRED, as a recorded no-action. Matches the real app's
 * "RECORD NO ACTION" button: recommendations are not silently logged as
 * acted-upon just because the Engine issued them.
 */
export async function recordRecommendation(
  beyondDayId: string,
  recommendation: Recommendation,
): Promise<void> {
  const type = recommendation.kind === "NO_ACTION_REQUIRED"
    ? "NO_ACTION_RECORDED"
    : "RECOMMENDATION_ACCEPTED";
  await logEvent(
    beyondDayId,
    type,
    { recommendationId: recommendation.id, kind: recommendation.kind },
    "USER",
    newId(),
  );
}

export async function startReset(
  beyondDayId: string,
  intensity: 1 | 2 | 3 | 4 | 5,
): Promise<string> {
  const correlationId = newId();
  const eventId = await logEvent(
    beyondDayId,
    "RESET_STARTED",
    { intensity },
    "USER",
    correlationId,
  );
  return eventId;
}

export async function completeReset(
  beyondDayId: string,
  resetStartedEventId: string,
): Promise<void> {
  await logEvent(
    beyondDayId,
    "RESET_COMPLETED",
    { resetStartedEventId },
    "USER",
    newId(),
    resetStartedEventId,
  );
}

export async function startShiftDown(beyondDayId: string): Promise<void> {
  const correlationId = newId();
  await logEvent(beyondDayId, "COMMAND_STARTED", { commandName: "START_SHIFT_DOWN" }, "USER", correlationId);
  await logEvent(beyondDayId, "COMMAND_COMPLETED", { commandName: "START_SHIFT_DOWN" }, "SYSTEM", correlationId);
}

export async function logWater(
  beyondDayId: string,
  amountOz: number,
): Promise<void> {
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WATER_LOGGED",
    { commandId: correlationId, amountOz },
    "USER",
    correlationId,
  );
}

/**
 * Correction/supersession, not overwrite. The original WATER_LOGGED fact
 * is never touched. targetEventId must be the current HEAD of its
 * correction chain (the original log, or the most recent correction) —
 * correcting a stale/already-superseded entry is rejected to prevent a
 * forked chain, per the proven Android acceptance behavior.
 */
export async function correctWater(
  beyondDayId: string,
  targetEventId: string,
  newAmountOz: number,
): Promise<void> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const corrections = events.filter((e) => e.type === "WATER_LOG_CORRECTED");
  const alreadySuperseded = corrections.some(
    (c) => (c.payload as { correctsEventId: string }).correctsEventId === targetEventId,
  );
  if (alreadySuperseded) {
    throw new Error(
      "STALE_CORRECTION_TARGET: this entry has already been corrected — correct the latest value instead.",
    );
  }
  const target = events.find((e) => e.id === targetEventId);
  if (!target) {
    throw new Error("CORRECTION_TARGET_NOT_FOUND");
  }
  const currentAmount =
    target.type === "WATER_LOGGED"
      ? (target.payload as { amountOz: number }).amountOz
      : (target.payload as { amountOz: number }).amountOz;
  if (currentAmount === newAmountOz) {
    throw new Error("NO_OP_CORRECTION: new value matches current effective value — no event created.");
  }
  await logEvent(
    beyondDayId,
    "WATER_LOG_CORRECTED",
    { correctsEventId: targetEventId, amountOz: newAmountOz },
    "USER",
    newId(),
    targetEventId,
  );
}

async function logEvent(
  beyondDayId: string,
  type: DomainEvent["type"],
  payload: unknown,
  source: DomainEvent["source"],
  correlationId: string,
  causationId?: string,
): Promise<string> {
  const event: DomainEvent = {
    id: newId(),
    type,
    beyondDayId,
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    payload,
    source,
    correlationId,
    ...(causationId ? { causationId } : {}),
  };
  await db.events.add(event);
  return event.id;
}
