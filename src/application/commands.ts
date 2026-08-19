import { db } from "../persistence/db";
import { evaluate } from "../engine/evaluate";
import type {
  BeyondDay,
  DomainEvent,
  Recommendation,
  StateCheckIn,
  WaterLogCorrectedPayload,
  WaterLoggedPayload,
} from "../domain/common/types";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Auto-close is a FALLBACK only, for when a new day starts while one is
 * still ACTIVE (Context & Safety Decisions, 2026-08-19). Calendar midnight
 * is explicitly rejected as a boundary; the primary mechanism is always
 * explicit endDay(). This never fires on the normal path where the prior
 * day was already ended before the next one starts.
 */
export async function startDay(): Promise<BeyondDay> {
  const existingActive = await db.beyondDays.filter((d) => d.status === "ACTIVE").last();
  if (existingActive) {
    await endDay(existingActive.id, "AUTO_CLOSED_ON_NEW_DAY_START");
  }

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

/**
 * Explicit END DAY. Closes silently — no recap (Context & Safety
 * Decisions, 2026-08-19). The Engine may SUGGEST calling this right after
 * primary sleep is logged (see queries.shouldSuggestEndDay), but ending is
 * always a distinct user (or fallback) action, never automatic on its own.
 */
export async function endDay(
  beyondDayId: string,
  reason: "EXPLICIT_END_DAY" | "AUTO_CLOSED_ON_NEW_DAY_START" = "EXPLICIT_END_DAY",
): Promise<void> {
  await db.beyondDays.update(beyondDayId, {
    status: "ENDED",
    updatedAt: new Date().toISOString(),
  });
  await logEvent(beyondDayId, "DAY_ENDED", { reason }, reason === "EXPLICIT_END_DAY" ? "USER" : "SYSTEM", newId());
}

/**
 * V0.1 sleep logging: duration only, no goal/target (Decision Register,
 * BODY/SLEEP — goals remain deferred; confirmed again in the 2026-08-19
 * authority reconciliation, which rejected a fixed 7-hour target). No
 * dedicated table; stored as event history only.
 */
export async function logSleep(beyondDayId: string, durationMinutes: number): Promise<void> {
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "SLEEP_LOGGED",
    { commandId: correlationId, durationMinutes },
    "USER",
    correlationId,
  );
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

/**
 * SHIFT DOWN needs its own duration input, same shape as RESET (BEYOND —
 * Context & Safety Decisions, 2026-08-19): a value chosen up front, then an
 * explicit START/COMPLETE two-step, rather than a single one-tap action.
 */
export async function startShiftDown(
  beyondDayId: string,
  durationMinutes: number,
): Promise<string> {
  const correlationId = newId();
  const eventId = await logEvent(
    beyondDayId,
    "SHIFT_DOWN_STARTED",
    { commandId: correlationId, durationMinutes },
    "USER",
    correlationId,
  );
  return eventId;
}

/**
 * Event type name matches the Decision Register's WORK TRANSITION section
 * verbatim ("SHIFT_DOWN_COMPLETED clears the post-shift requirement") so
 * that hook is ready to wire up whenever the workContext/post-shift
 * mechanism is built — not implemented by this command itself.
 */
export async function completeShiftDown(
  beyondDayId: string,
  shiftDownStartedEventId: string,
): Promise<void> {
  await logEvent(
    beyondDayId,
    "SHIFT_DOWN_COMPLETED",
    { commandId: newId(), shiftDownStartedEventId },
    "USER",
    newId(),
    shiftDownStartedEventId,
  );
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
 *
 * Payload field names (originalEventId, supersedesEventId) are confirmed
 * against the real historical app's backup export — see
 * WaterLogCorrectedPayload in domain/common/types.ts.
 */
export async function correctWater(
  beyondDayId: string,
  targetEventId: string,
  newAmountOz: number,
): Promise<void> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const corrections = events.filter(
    (e): e is DomainEvent<WaterLogCorrectedPayload> => e.type === "WATER_LOG_CORRECTED",
  );
  const alreadySuperseded = corrections.some((c) => c.payload.supersedesEventId === targetEventId);
  if (alreadySuperseded) {
    throw new Error(
      "STALE_CORRECTION_TARGET: this entry has already been corrected — correct the latest value instead.",
    );
  }
  const target = events.find((e) => e.id === targetEventId);
  if (!target) {
    throw new Error("CORRECTION_TARGET_NOT_FOUND");
  }
  if (target.type !== "WATER_LOGGED" && target.type !== "WATER_LOG_CORRECTED") {
    throw new Error("CORRECTION_TARGET_INVALID_TYPE");
  }
  const currentAmount =
    target.type === "WATER_LOGGED"
      ? (target.payload as WaterLoggedPayload).amountOz
      : (target.payload as WaterLogCorrectedPayload).amountOz;
  if (currentAmount === newAmountOz) {
    throw new Error("NO_OP_CORRECTION: new value matches current effective value — no event created.");
  }
  const originalEventId =
    target.type === "WATER_LOGGED"
      ? target.id
      : (target.payload as WaterLogCorrectedPayload).originalEventId;

  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WATER_LOG_CORRECTED",
    { commandId: correlationId, originalEventId, supersedesEventId: targetEventId, amountOz: newAmountOz },
    "USER",
    correlationId,
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
