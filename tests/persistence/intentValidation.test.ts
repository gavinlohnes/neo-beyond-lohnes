import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { createMission, createObligation } from "../../src/application/intentCommands";
import { getMission, getMissions, getObligation, getObligations } from "../../src/application/intentQueries";
import { parseMission, parseObligation } from "../../src/persistence/intentValidation";

/**
 * Intent & Commitment Spine — Drop 01 (2026-08-22, approved), section 8:
 * "Invalid Mission/Obligation records must not silently become canonical
 * truth." Proven here by hand-corrupting a row directly in Dexie (as a
 * hand-edited or corrupted imported backup would) and confirming the
 * query layer excludes it rather than crashing or trusting it — same
 * "unknown is better than false precision" contract as
 * schedulePatternValidation.ts's parseSchedulePattern.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("parseMission / parseObligation", () => {
  it("never throws — returns null for garbage input", () => {
    expect(parseMission(null)).toBeNull();
    expect(parseMission({})).toBeNull();
    expect(parseMission({ id: "x" })).toBeNull();
    expect(parseObligation(null)).toBeNull();
    expect(parseObligation({ id: "x", status: "NOT_A_REAL_STATUS" })).toBeNull();
  });

  it("accepts a genuine record round-tripped through Dexie", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const raw = await db.missions.get(mission.id);
    expect(parseMission(raw)).toEqual(mission);
  });
});

describe("a corrupted Mission row is excluded from query results, not thrown on", () => {
  it("getMissions skips a row with an invalid status", async () => {
    const good = await createMission({ title: "Good mission" });
    await db.missions.add({
      id: "corrupted-mission",
      title: "Corrupted",
      status: "NOT_A_REAL_STATUS",
      source: "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);

    const missions = await getMissions();
    expect(missions.map((m) => m.id)).toEqual([good.id]);
    expect(await getMission("corrupted-mission")).toBeUndefined();
  });
});

describe("a corrupted Obligation row is excluded from query results, not thrown on", () => {
  it("getObligations skips a row missing a required field", async () => {
    const good = await createObligation({ title: "Good obligation" });
    await db.obligations.add({
      id: "corrupted-obligation",
      // title missing entirely — simulates a hand-edited/corrupted backup
      status: "OPEN",
      source: "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);

    const obligations = await getObligations();
    expect(obligations.map((o) => o.id)).toEqual([good.id]);
    expect(await getObligation("corrupted-obligation")).toBeUndefined();
  });

  it("rejects a dueAt that isn't YYYY-MM-DD even if it slipped into storage some other way", async () => {
    const good = await createObligation({ title: "Good obligation" });
    await db.obligations.add({
      id: "bad-date",
      title: "Bad date",
      status: "OPEN",
      dueAt: "not-a-date",
      source: "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);

    const obligations = await getObligations();
    expect(obligations.map((o) => o.id)).toEqual([good.id]);
  });
});
