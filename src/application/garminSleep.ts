import { db } from "../persistence/db";
import { logEvent, newId } from "./commands";
import { assignGarminSleep, type GarminSleepSource, type ShiftWindow } from "../domain/health/sleepImport";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { getSchedulePattern } from "./queries";
import type { BeyondDay } from "../domain/common/types";
import type { DomainEvent, SleepLoggedPayload } from "../domain/common/types";

/** Tables applyGarminSleep reads or writes, beyond the sequence tables writeAtomically always adds. */
export const GARMIN_SLEEP_TABLES = ["beyondDays", "externalSleepRecords", "externalSleepRevisions", "schedulePatterns"] as const;

/**
 * SLEEP-FILING-001: the shifts BEYOND knows you actually worked — lived days recorded as WORK, with
 * the scheduled shift that day owns. Days off and days without a recorded work context have none.
 */
export async function getWorkedShiftWindows(days: readonly BeyondDay[]): Promise<ShiftWindow[]> {
  const pattern = await getSchedulePattern();
  return days.flatMap((day) => {
    if (day.workContext !== "WORK") return [];
    const window = livedDayShiftWindow(new Date(day.startedAt), pattern);
    return window ? [{ dayId: day.id, start: window.start.getTime(), end: window.end.getTime() }] : [];
  });
}

type Kind = SleepLoggedPayload["kind"];
const garminSource = (e: DomainEvent) => (e.payload as SleepLoggedPayload).source;
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
 * - an entry the owner deleted, replaced or corrected is never re-added or overwritten;
 * - an untouched entry whose sleep moved to another day, or fell below the minimum, is withdrawn.
 */
export async function applyGarminSleep(): Promise<{ logged: number; corrected: number; removed: number }> {
  const [days, pointers] = await Promise.all([db.beyondDays.toArray(), db.externalSleepRecords.toArray()]);
  const revisions = await db.externalSleepRevisions.bulkGet(pointers.map((p) => p.revisionId));
  const records = revisions.flatMap((r) => (r ? [{ recordKey: r.recordKey, sourceVersion: r.sourceVersion, evidence: r.evidence, associatedDayId: r.associatedDayId }] : []));
  const result = { logged: 0, corrected: 0, removed: 0 };
  const assignments = assignGarminSleep(days, records, await getWorkedShiftWindows(days));
  const assignedDay = new Map(assignments.map((a) => [a.recordKey, a.dayId]));
  // Every sleep log, correction and void, across days: a Garmin sleep can move between days.
  const events = await db.events.where("type").anyOf(["SLEEP_LOGGED", "SLEEP_LOG_CORRECTED", "SLEEP_LOG_VOIDED"]).toArray();
  const voids = events.filter((e) => e.type === "SLEEP_LOG_VOIDED");
  const voided = new Set(voids.map((e) => (e.payload as { loggedEventId: string }).loggedEventId));
  const garminLogs = events.filter((e) => e.type === "SLEEP_LOGGED" && garminSource(e));
  const keyOf = (e: DomainEvent) => garminSource(e)!.recordKey;
  // The owner deleted it (a USER void) or replaced it with their own entry (a SYSTEM void caused by
  // that entry): never filled in again.
  const ownerSettled = new Set(garminLogs.filter((e) => voids.some((v) => (v.payload as { loggedEventId: string }).loggedEventId === e.id
    && (v.source === "USER" || v.causationId !== e.id))).map(keyOf));

  // A newer Garmin version can move a sleep to another day or below the minimum: withdraw the
  // untouched entry it left behind, so one sleep never counts on two days.
  for (const e of garminLogs) {
    if (!e.beyondDayId || voided.has(e.id) || assignedDay.get(keyOf(e)) === e.beyondDayId || chainOf(events, e).ownerCorrected) continue;
    await voidAsSystem(e.beyondDayId, e.id);
    voided.add(e.id);
    result.removed++;
  }

  for (const dayId of new Set(assignments.map((a) => a.dayId))) {
    const logs = garminLogs.filter((e) => e.beyondDayId === dayId);
    const ownerKinds = new Set(events.filter((e) => e.beyondDayId === dayId && e.type === "SLEEP_LOGGED" && !voided.has(e.id) && !garminSource(e))
      .map((e) => (e.payload as SleepLoggedPayload).kind ?? "PRIMARY"));
    for (const a of assignments.filter((x) => x.dayId === dayId)) {
      if (ownerSettled.has(a.recordKey)) continue;
      const active = logs.find((e) => keyOf(e) === a.recordKey && !voided.has(e.id));
      const source: GarminSleepSource = { kind: "GARMIN", recordKey: a.recordKey, sourceVersion: a.sourceVersion };
      const log = async (kind: Kind, causationId?: string) => {
        const commandId = newId();
        const payload: SleepLoggedPayload = { commandId, durationMinutes: a.minutes, kind, source };
        await logEvent(dayId, "SLEEP_LOGGED", payload, "SYSTEM", commandId, causationId, a.endTime);
        result.logged++;
      };
      if (!active) {
        if (!ownerKinds.has(a.kind)) await log(a.kind);
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
