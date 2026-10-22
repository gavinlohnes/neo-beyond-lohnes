import { db } from "../persistence/db";
import { logEvent, newId } from "./commands";
import { assignGarminSleep, type GarminSleepSource } from "../domain/health/sleepImport";
import type { DomainEvent, SleepLoggedPayload } from "../domain/common/types";

/** Tables applyGarminSleep reads or writes, beyond the sequence tables writeAtomically always adds. */
export const GARMIN_SLEEP_TABLES = ["beyondDays", "externalSleepRecords", "externalSleepRevisions"] as const;

type Kind = SleepLoggedPayload["kind"];
const garminSource = (e: DomainEvent) => (e.payload as SleepLoggedPayload).source;
const voidedIds = (events: DomainEvent[]) =>
  new Set(events.filter((e) => e.type === "SLEEP_LOG_VOIDED").map((e) => (e.payload as { loggedEventId: string }).loggedEventId));
/** The effective minutes of a sleep entry and whether the owner (not Garmin) ever corrected it. */
function chainOf(events: DomainEvent[], root: DomainEvent): { minutes: number; headId: string; ownerCorrected: boolean } {
  const corrections = events.filter((e) => e.type === "SLEEP_LOG_CORRECTED" && (e.payload as { originalEventId: string }).originalEventId === root.id)
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const head = corrections.at(-1);
  return {
    minutes: head ? (head.payload as { durationMinutes: number }).durationMinutes : (root.payload as SleepLoggedPayload).durationMinutes,
    headId: head?.id ?? root.id,
    ownerCorrected: corrections.some((c) => c.source === "USER"),
  };
}
async function voidAsSystem(dayId: string, rootId: string, causationId?: string) {
  const commandId = newId();
  await logEvent(dayId, "SLEEP_LOG_VOIDED", { commandId, loggedEventId: rootId }, "SYSTEM", commandId, causationId ?? rootId);
}

/**
 * GARMIN-003 (owner ruling 2026-10-22, approach A): Garmin fills in the owner's sleep. Run inside the
 * confirmed import's transaction; safe to repeat. For each Garmin sleep that belongs to a lived day:
 * - no entry yet and no owner entry of that kind on the day → log it (source SYSTEM, payload source
 *   GARMIN, occurred at wake time);
 * - Garmin entry still active and never corrected by the owner → follow a newer Garmin value with a
 *   correction, or move it between main sleep and nap;
 * - an entry the owner deleted, replaced or corrected is never re-added or overwritten.
 */
export async function applyGarminSleep(): Promise<{ logged: number; corrected: number }> {
  const [days, pointers] = await Promise.all([db.beyondDays.toArray(), db.externalSleepRecords.toArray()]);
  const revisions = await db.externalSleepRevisions.bulkGet(pointers.map((p) => p.revisionId));
  const records = revisions.flatMap((r) => (r ? [{ recordKey: r.recordKey, sourceVersion: r.sourceVersion, evidence: r.evidence }] : []));
  const result = { logged: 0, corrected: 0 };
  const assignments = assignGarminSleep(days, records);
  for (const dayId of new Set(assignments.map((a) => a.dayId))) {
    const events = await db.events.where("beyondDayId").equals(dayId).toArray();
    const voided = voidedIds(events);
    const logs = events.filter((e) => e.type === "SLEEP_LOGGED");
    const ownerKinds = new Set(logs.filter((e) => !voided.has(e.id) && !garminSource(e)).map((e) => (e.payload as SleepLoggedPayload).kind ?? "PRIMARY"));
    for (const a of assignments.filter((x) => x.dayId === dayId)) {
      const mine = logs.filter((e) => garminSource(e)?.recordKey === a.recordKey);
      const active = mine.find((e) => !voided.has(e.id));
      const source: GarminSleepSource = { kind: "GARMIN", recordKey: a.recordKey, sourceVersion: a.sourceVersion };
      const log = async (kind: Kind, causationId?: string) => {
        const commandId = newId();
        const payload: SleepLoggedPayload = { commandId, durationMinutes: a.minutes, kind, source };
        await logEvent(dayId, "SLEEP_LOGGED", payload, "SYSTEM", commandId, causationId, a.endTime);
        result.logged++;
      };
      if (!active) {
        // Deleted or replaced before: the owner's decision stands.
        if (!mine.length && !ownerKinds.has(a.kind)) await log(a.kind);
        continue;
      }
      const chain = chainOf(events, active);
      if (chain.ownerCorrected) continue;
      const activeKind = (active.payload as SleepLoggedPayload).kind ?? "PRIMARY";
      if (activeKind !== a.kind) {
        await voidAsSystem(dayId, active.id);
        if (!ownerKinds.has(a.kind)) await log(a.kind, active.id);
        continue;
      }
      if (chain.minutes !== a.minutes) {
        const commandId = newId();
        await logEvent(dayId, "SLEEP_LOG_CORRECTED",
          { commandId, originalEventId: active.id, supersedesEventId: chain.headId, durationMinutes: a.minutes, source }, "SYSTEM", commandId, chain.headId);
        result.corrected++;
      }
    }
  }
  return result;
}
