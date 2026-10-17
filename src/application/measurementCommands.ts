import { db } from "../persistence/db";
import { newId } from "./commands";
import { writeAtomically } from "./atomicWrite";
import { logUnscopedEvent } from "./unscopedEvents";
import { formatLocalDate } from "../engine/scheduledContext";
import type { DomainEvent } from "../domain/common/types";
import type {
  MeasurementLogCorrectedPayload,
  MeasurementLoggedPayload,
  MeasurementLogVoidedPayload,
} from "../domain/body/types";
import {
  measurementCorrectionInputSchema,
  measurementInputSchema,
  type MeasurementCorrectionInput,
  type MeasurementInput,
} from "../persistence/bodyRecordValidation";

/**
 * REVIEW-001 Phase 1a: body measurements, corrected like other BODY logs
 * (see domain/body/types.ts). A measurement can be dated earlier than today,
 * so tape measurements taken before launch count, but never later.
 */

function assertNotFuture(measuredOn: string, now: Date): void {
  if (measuredOn > formatLocalDate(now)) {
    throw new Error("MEASUREMENT_IN_FUTURE: A measurement can't be dated after today.");
  }
}

export async function logMeasurement(input: MeasurementInput, now: Date = new Date()): Promise<string> {
  const { site, inches, measuredOn } = measurementInputSchema.parse(input);
  assertNotFuture(measuredOn, now);
  const commandId = newId();
  const payload: MeasurementLoggedPayload = { commandId, site, inches, measuredOn };
  // An async callback, as every command here uses: Dexie commits early when handed the helper's promise directly.
  return writeAtomically([], async () => logUnscopedEvent("MEASUREMENT_LOGGED", payload, commandId));
}

async function measurementEvents(): Promise<DomainEvent[]> {
  return db.events.where("type").anyOf("MEASUREMENT_LOGGED", "MEASUREMENT_LOG_CORRECTED", "MEASUREMENT_LOG_VOIDED").toArray();
}

function rootIdOf(event: DomainEvent): string {
  return event.type === "MEASUREMENT_LOGGED" ? event.id : (event.payload as MeasurementLogCorrectedPayload).originalEventId;
}

function isVoided(events: readonly DomainEvent[], rootId: string): boolean {
  return events.some((e) => e.type === "MEASUREMENT_LOG_VOIDED" && (e.payload as MeasurementLogVoidedPayload).loggedEventId === rootId);
}

function findEntryEvent(events: readonly DomainEvent[], eventId: string): DomainEvent {
  const target = events.find((e) => e.id === eventId);
  if (!target || (target.type !== "MEASUREMENT_LOGGED" && target.type !== "MEASUREMENT_LOG_CORRECTED")) {
    throw new Error("MEASUREMENT_NOT_FOUND: That measurement could not be found.");
  }
  return target;
}

/**
 * Corrects the value and/or date of the measurement whose latest event is
 * `targetEventId`. Correcting an older link in the chain is refused, as for
 * the other BODY logs, so a stale screen can't overwrite a newer correction.
 */
export async function correctMeasurement(
  targetEventId: string,
  changes: MeasurementCorrectionInput,
  now: Date = new Date(),
): Promise<string> {
  const parsed = measurementCorrectionInputSchema.parse(changes);
  return writeAtomically([], async () => {
    const events = await measurementEvents();
    const target = findEntryEvent(events, targetEventId);
    const superseded = events.some(
      (e) => e.type === "MEASUREMENT_LOG_CORRECTED" && (e.payload as MeasurementLogCorrectedPayload).supersedesEventId === targetEventId,
    );
    if (superseded) {
      throw new Error("STALE_CORRECTION_TARGET: This measurement has already been corrected — correct the latest value instead.");
    }
    const rootId = rootIdOf(target);
    if (isVoided(events, rootId)) {
      throw new Error("MEASUREMENT_VOIDED: This measurement was removed and can no longer be corrected.");
    }
    const current = target.payload as { inches: number; measuredOn: string };
    const inches = parsed.inches ?? current.inches;
    const measuredOn = parsed.measuredOn ?? current.measuredOn;
    if (inches === current.inches && measuredOn === current.measuredOn) {
      throw new Error("NO_OP_CORRECTION: No changes.");
    }
    assertNotFuture(measuredOn, now);
    const commandId = newId();
    const payload: MeasurementLogCorrectedPayload = { commandId, originalEventId: rootId, supersedesEventId: targetEventId, inches, measuredOn };
    return logUnscopedEvent("MEASUREMENT_LOG_CORRECTED", payload, commandId, targetEventId);
  });
}

/** Takes a measurement out of every reading; its events stay. Accepts any event in its chain; repeating it is a no-op. */
export async function voidMeasurement(eventId: string): Promise<void> {
  await writeAtomically([], async () => {
    const events = await measurementEvents();
    const rootId = rootIdOf(findEntryEvent(events, eventId));
    if (isVoided(events, rootId)) return;
    const commandId = newId();
    const payload: MeasurementLogVoidedPayload = { commandId, loggedEventId: rootId };
    await logUnscopedEvent("MEASUREMENT_LOG_VOIDED", payload, commandId, rootId);
  });
}
