import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { correctSleep, logSleep, voidSleepLog } from "../../src/application/commands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { getSleepEntries } from "../../src/application/queries";
import { assignGarminSleep } from "../../src/domain/health/sleepImport";
import type { SleepLoggedPayload } from "../../src/domain/common/types";
import { syntheticSleep } from "../helpers/syntheticSleep";

/**
 * GARMIN-003 (owner ruling 2026-10-22, approach A): Garmin fills in the owner's sleep; the owner's
 * own entry, deletion or correction always wins.
 */
beforeEach(async () => { await db.open(); await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); }); });
afterEach(async () => { await db.delete(); });
// A lived day starting 16:30 Chicago (21:30Z) on Oct 17; the synthetic sleep runs 07:00–08:00Z Oct 18.
const day = { id: "day-1", startedAt: "2026-10-17T21:30:00Z", timezoneId: "America/Chicago", workContext: "WORK" as const, status: "ACTIVE" as const, createdAt: "2026-10-17T21:30:00Z", updatedAt: "2026-10-17T21:30:00Z" };
function sleep(id: string, start: string, end: string, modified = "2026-10-18T12:00:00Z") {
  const s = syntheticSleep();
  s.records = [{ ...s.records[0]!, id, startTime: start, endTime: end, lastModifiedTime: modified, stages: [] }];
  return s;
}
const entries = () => getSleepEntries(day.id);

describe("Garmin sleep fills in the day", () => {
  it("logs the night as main sleep marked Garmin, at wake time, once", async () => {
    await db.beyondDays.add(day);
    const result = await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T13:00:00Z"));
    expect(result).toMatchObject({ inserted: 1, logged: 1, corrected: 0 });
    expect((await entries()).map((e) => [e.kind, e.effectiveDurationMinutes, e.fromGarmin])).toEqual([["PRIMARY", 360, true]]);
    const event = (await db.events.where("type").equals("SLEEP_LOGGED").toArray())[0]!;
    expect(event.source).toBe("SYSTEM");
    expect(event.occurredAt).toBe("2026-10-18T13:00:00Z");
    expect((event.payload as SleepLoggedPayload).source).toMatchObject({ kind: "GARMIN" });
    expect(await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T13:00:00Z"))).toMatchObject({ logged: 0, corrected: 0 });
    expect(await entries()).toHaveLength(1);
  });

  it("leaves sleep with no BEYOND day as evidence only", async () => {
    await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T13:00:00Z"));
    expect(await db.events.count()).toBe(0);
    expect(await db.externalSleepRecords.count()).toBe(1);
  });

  it("never replaces the owner's own entry, and the owner's later entry replaces Garmin's", async () => {
    await db.beyondDays.add(day);
    await logSleep(day.id, 300, "PRIMARY");
    expect(await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T13:00:00Z"))).toMatchObject({ logged: 0 });
    expect((await entries()).map((e) => [e.effectiveDurationMinutes, e.fromGarmin])).toEqual([[300, false]]);

    await db.events.clear(); await db.externalSleepRecords.clear(); await db.externalSleepRevisions.clear();
    await importSleepSnapshot(sleep("night-2", "2026-10-18T07:30:00Z", "2026-10-18T13:30:00Z"));
    await logSleep(day.id, 420, "PRIMARY");
    expect((await entries()).map((e) => [e.effectiveDurationMinutes, e.fromGarmin])).toEqual([[420, false]]);
  });

  it("follows a newer Garmin value, but never overwrites the owner's correction or re-adds a deleted entry", async () => {
    await db.beyondDays.add(day);
    await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T13:00:00Z"));
    expect(await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T13:30:00Z", "2026-10-18T14:00:00Z"))).toMatchObject({ corrected: 1 });
    expect((await entries())[0]!.effectiveDurationMinutes).toBe(390);

    const entry = (await entries())[0]!;
    await correctSleep(day.id, entry.headEventId, 400);
    await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T14:00:00Z", "2026-10-18T15:00:00Z"));
    expect((await entries())[0]!.effectiveDurationMinutes).toBe(400);

    await voidSleepLog(day.id, entry.rootEventId);
    await importSleepSnapshot(sleep("night", "2026-10-18T07:00:00Z", "2026-10-18T14:30:00Z", "2026-10-18T16:00:00Z"));
    expect(await entries()).toEqual([]);
  });

  it("makes the longest sleep of the day the main sleep and the rest naps", async () => {
    await db.beyondDays.add(day);
    await importSleepSnapshot(sleep("nap", "2026-10-18T07:00:00Z", "2026-10-18T08:00:00Z"));
    expect((await entries()).map((e) => e.kind)).toEqual(["PRIMARY"]);
    const both = syntheticSleep();
    both.records = [
      { ...sleep("nap", "2026-10-18T07:00:00Z", "2026-10-18T08:00:00Z").records[0]! },
      { ...sleep("main", "2026-10-18T09:00:00Z", "2026-10-18T15:00:00Z").records[0]! },
    ];
    await importSleepSnapshot(both);
    const kinds = (await entries()).map((e) => [e.kind, e.effectiveDurationMinutes]).sort();
    expect(kinds).toEqual([["PRIMARY", 360], ["SUPPLEMENTAL", 60]]);
  });
});

describe("assignGarminSleep", () => {
  const rec = (key: string, start: string, end: string) => ({ recordKey: key, sourceVersion: "v", evidence: { ...syntheticSleep().records[0]!, id: key, startTime: start, endTime: end, stages: [] } });
  it("uses the day the sleep starts in, capped at 24 hours, and skips very short sessions", () => {
    const days = [day, { ...day, id: "day-2", startedAt: "2026-10-20T21:30:00Z" }];
    const out = assignGarminSleep(days, [
      rec("a", "2026-10-18T07:00:00Z", "2026-10-18T13:00:00Z"), // day-1
      rec("b", "2026-10-19T07:00:00Z", "2026-10-19T13:00:00Z"), // more than 24 h after day-1 began: no day
      rec("c", "2026-10-21T08:00:00Z", "2026-10-21T08:05:00Z"), // day-2 but 5 minutes
      rec("d", "2026-10-17T10:00:00Z", "2026-10-17T15:00:00Z"), // before any day
    ]);
    expect(out.map((a) => [a.recordKey, a.dayId, a.kind])).toEqual([["a", "day-1", "PRIMARY"]]);
  });
});
