import { db } from "../persistence/db";
import { DAY_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { deriveShortSleepStreak } from "../engine/sleepStreak";
import { getDaySummaries } from "./dayLedgerQueries";
import { getActiveDay } from "./queries";
import { issueRecommendationForCheckIn, logEvent, newId, nextSeq } from "./commands";
import {
  CHECK_IN_VALUE_KEYS,
  chainForCheckIn,
  checkInChains,
  sameAnswers,
  type CheckInAnswers,
  type CheckInChain,
} from "../domain/checkInCorrections";
import type {
  CheckInCorrectedPayload,
  CheckInCorrectionUndonePayload,
  Recommendation,
  StateCheckIn,
} from "../domain/common/types";

/**
 * GRAYSON-CHECKIN-EDIT-001 (Gavin, 2026-11-24). Fix a sent check-in, and undo that fix. Append-only: a fix adds a
 * corrected row and a CHECK_IN_CORRECTED event; an undo adds CHECK_IN_CORRECTION_UNDONE. No row is edited or
 * deleted. When the check-in is the latest that counts on the ACTIVE day, today's advice is re-worked through the
 * same evaluate-and-issue step submitCheckIn uses; a past or earlier check-in never re-issues a recommendation.
 */
export type CheckInCorrectionResult =
  | { status: "CORRECTED"; correctionEventId: string; checkIn: StateCheckIn; recommendation?: Recommendation }
  | { status: "UNDONE"; checkIn: StateCheckIn; recommendation?: Recommendation }
  | { status: "NO_OP" }
  | { status: "STALE" }
  | { status: "NOT_FOUND" };

const RANGES: Record<(typeof CHECK_IN_VALUE_KEYS)[number], readonly [number, number]> = {
  energy: [1, 5],
  stress: [1, 5],
  mood: [1, 5],
  soreness: [0, 5],
  alcoholUrge: [0, 5],
};

export function assertCheckInAnswers(values: CheckInAnswers): void {
  for (const key of CHECK_IN_VALUE_KEYS) {
    const value = values[key];
    const [min, max] = RANGES[key];
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Check-in ${key} must be ${min}–${max}.`);
  }
}

/**
 * The short-sleep reading for a re-worked recommendation. Read before the write transaction, as submitCheckIn does,
 * because the ledger reads tables the day write does not hold; only taken when the check-in's day is the active one.
 */
async function sleepForActiveDay(beyondDayId: string) {
  const active = await getActiveDay();
  if (active?.id !== beyondDayId) return undefined;
  return deriveShortSleepStreak(await getDaySummaries(), beyondDayId, new Date());
}

async function chainsFor(beyondDayId: string): Promise<CheckInChain[]> {
  return checkInChains(await db.events.where("beyondDayId").equals(beyondDayId).toArray());
}

/** Inside the transaction: re-work today's advice when this chain is the active day's latest that counts. */
async function reworkIfLatest(
  beyondDayId: string,
  originalCheckInId: string,
  sleep: ReturnType<typeof deriveShortSleepStreak> | undefined,
  correlationId: string,
): Promise<Recommendation | undefined> {
  if (!sleep) return undefined;
  const active = await getActiveDay();
  if (active?.id !== beyondDayId) return undefined;
  const latest = (await chainsFor(beyondDayId)).at(-1);
  if (!latest || latest.originalCheckInId !== originalCheckInId) return undefined;
  return issueRecommendationForCheckIn(beyondDayId, latest.current, sleep, correlationId);
}

/** Fix the answers of the check-in that counts now. A superseded row is refused as STALE; unchanged answers are a NO_OP. */
export async function correctCheckIn(checkInId: string, values: CheckInAnswers): Promise<CheckInCorrectionResult> {
  assertCheckInAnswers(values);
  const row = await db.checkIns.get(checkInId);
  if (!row) return { status: "NOT_FOUND" };
  const sleep = await sleepForActiveDay(row.beyondDayId);
  return writeAtomically(DAY_WRITE_TABLES, async () => {
    const chain = chainForCheckIn(await chainsFor(row.beyondDayId), checkInId);
    if (!chain) return { status: "NOT_FOUND" } as const;
    if (chain.current.id !== checkInId) return { status: "STALE" } as const;
    if (sameAnswers(chain.current, values)) return { status: "NO_OP" } as const;
    const checkIn: StateCheckIn = {
      id: newId(),
      beyondDayId: row.beyondDayId,
      recordedAt: chain.original.recordedAt,
      seq: await nextSeq(),
      energy: values.energy,
      stress: values.stress,
      mood: values.mood,
      soreness: values.soreness,
      alcoholUrge: values.alcoholUrge,
      correctsCheckInId: chain.current.id,
    };
    const commandId = newId();
    await db.checkIns.add(checkIn);
    const payload: CheckInCorrectedPayload = {
      commandId,
      supersedesCheckInId: chain.current.id,
      originalCheckInId: chain.originalCheckInId,
      checkIn,
    };
    const correctionEventId = await logEvent(row.beyondDayId, "CHECK_IN_CORRECTED", payload, "USER", commandId);
    const recommendation = await reworkIfLatest(row.beyondDayId, chain.originalCheckInId, sleep, commandId);
    return { status: "CORRECTED", correctionEventId, checkIn, ...(recommendation ? { recommendation } : {}) } as const;
  });
}

/** Undo the newest standing fix of a check-in: its answers before that fix count again. Older fixes are STALE. */
export async function undoCheckInCorrection(correctionEventId: string): Promise<CheckInCorrectionResult> {
  const event = await db.events.get(correctionEventId);
  if (!event || event.type !== "CHECK_IN_CORRECTED" || !event.beyondDayId) return { status: "NOT_FOUND" };
  const beyondDayId = event.beyondDayId;
  const { originalCheckInId } = event.payload as CheckInCorrectedPayload;
  const sleep = await sleepForActiveDay(beyondDayId);
  return writeAtomically(DAY_WRITE_TABLES, async () => {
    const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
    const alreadyUndone = events.some(
      (e) => e.type === "CHECK_IN_CORRECTION_UNDONE" && (e.payload as CheckInCorrectionUndonePayload).correctionEventId === correctionEventId,
    );
    if (alreadyUndone) return { status: "NO_OP" } as const;
    const chain = checkInChains(events).find((c) => c.originalCheckInId === originalCheckInId);
    if (!chain || chain.fixes.at(-1)?.eventId !== correctionEventId) return { status: "STALE" } as const;
    const commandId = newId();
    const payload: CheckInCorrectionUndonePayload = { commandId, correctionEventId };
    await logEvent(beyondDayId, "CHECK_IN_CORRECTION_UNDONE", payload, "USER", commandId);
    const restored = chain.fixes.at(-1)!.before;
    const recommendation = await reworkIfLatest(beyondDayId, originalCheckInId, sleep, commandId);
    return { status: "UNDONE", checkIn: restored, ...(recommendation ? { recommendation } : {}) } as const;
  });
}
