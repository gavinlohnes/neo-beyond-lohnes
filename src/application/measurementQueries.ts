import { db } from "../persistence/db";
import { byTimeThenSeq } from "./queries";
import type { DomainEvent } from "../domain/common/types";
import type {
  MeasurementLogCorrectedPayload,
  MeasurementLoggedPayload,
  MeasurementLogVoidedPayload,
  MeasurementSite,
} from "../domain/body/types";

/**
 * REVIEW-001 Phase 1a: effective body measurements — each MEASUREMENT_LOGGED
 * chain resolved to its latest correction, removed chains left out. Read
 * only; nothing here reaches the Engine.
 */
export interface MeasurementEntry {
  rootEventId: string;
  /** The event a correction or removal must target. */
  headEventId: string;
  site: MeasurementSite;
  inches: number;
  measuredOn: string;
  originalInches: number;
  originalMeasuredOn: string;
  correctionCount: number;
  recordedAt: string;
}

/** Every measurement (or one site's), oldest measurement date first; same-date entries in the order they were logged. */
export async function getMeasurements(site?: MeasurementSite): Promise<MeasurementEntry[]> {
  const events = await db.events.where("type").anyOf("MEASUREMENT_LOGGED", "MEASUREMENT_LOG_CORRECTED", "MEASUREMENT_LOG_VOIDED").toArray();
  const voided = new Set(
    events.filter((e) => e.type === "MEASUREMENT_LOG_VOIDED").map((e) => (e.payload as MeasurementLogVoidedPayload).loggedEventId),
  );
  const nextBySupersedes = new Map<string, DomainEvent>();
  for (const e of events) {
    if (e.type === "MEASUREMENT_LOG_CORRECTED") nextBySupersedes.set((e.payload as MeasurementLogCorrectedPayload).supersedesEventId, e);
  }
  const roots = events
    .filter((e) => e.type === "MEASUREMENT_LOGGED" && !voided.has(e.id))
    .filter((e) => site === undefined || (e.payload as MeasurementLoggedPayload).site === site)
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq));

  const entries = roots.map((root): MeasurementEntry => {
    const original = root.payload as MeasurementLoggedPayload;
    let head = root;
    let correctionCount = 0;
    for (let next = nextBySupersedes.get(head.id); next; next = nextBySupersedes.get(head.id)) {
      head = next;
      correctionCount += 1;
    }
    const effective = head.payload as { inches: number; measuredOn: string };
    return {
      rootEventId: root.id,
      headEventId: head.id,
      site: original.site,
      inches: effective.inches,
      measuredOn: effective.measuredOn,
      originalInches: original.inches,
      originalMeasuredOn: original.measuredOn,
      correctionCount,
      recordedAt: root.recordedAt,
    };
  });
  // Stable sort: same-date entries keep logged order.
  return entries.sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
}

/** The latest measurement per site, by measurement date. */
export async function getLatestMeasurements(): Promise<Partial<Record<MeasurementSite, MeasurementEntry>>> {
  const latest: Partial<Record<MeasurementSite, MeasurementEntry>> = {};
  for (const entry of await getMeasurements()) latest[entry.site] = entry;
  return latest;
}
