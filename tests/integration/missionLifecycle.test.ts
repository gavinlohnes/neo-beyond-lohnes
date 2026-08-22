import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { archiveMission, createMission, modifyMission } from "../../src/application/intentCommands";
import { getActiveMissions, getMission, getMissionHistory, getMissions } from "../../src/application/intentQueries";

/**
 * Intent & Commitment Spine — Drop 01 (2026-08-22, approved). Mission
 * lifecycle: create, modify, archive. Canonical state lives in
 * db.missions; every meaningful change also produces a real historical
 * DomainEvent scoped by missionId (not beyondDayId — Missions are not
 * day-scoped, same reasoning as CaptureItem).
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("createMission", () => {
  it("rejects an empty title rather than creating a blank record", async () => {
    await expect(createMission({ title: "" })).rejects.toThrow();
    expect(await getMissions()).toHaveLength(0);
  });

  it("creates an ACTIVE mission with source USER and no description by default", async () => {
    const mission = await createMission({ title: "Get promoted" });
    expect(mission.status).toBe("ACTIVE");
    expect(mission.source).toBe("USER");
    expect(mission.description).toBeUndefined();
    expect(mission.title).toBe("Get promoted");
  });

  it("persists — a fresh query sees it", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const fetched = await getMission(mission.id);
    expect(fetched).toEqual(mission);
  });

  it("logs exactly one MISSION_CREATED event, scoped by missionId, not beyondDayId", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const history = await getMissionHistory(mission.id);
    expect(history).toHaveLength(1);
    expect(history[0]!.type).toBe("MISSION_CREATED");
    expect(history[0]!.missionId).toBe(mission.id);
    expect(history[0]!.beyondDayId).toBeUndefined();
  });

  it("does not require an active BeyondDay — Missions are not day-scoped", async () => {
    await expect(createMission({ title: "No day started" })).resolves.not.toThrow();
  });
});

describe("modifyMission", () => {
  it("updates title/description and bumps updatedAt", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const before = mission.updatedAt;
    await new Promise((r) => setTimeout(r, 2));
    const updated = await modifyMission(mission.id, { description: "By Q4" });
    expect(updated.title).toBe("Get promoted"); // unchanged field preserved
    expect(updated.description).toBe("By Q4");
    expect(updated.updatedAt).not.toBe(before);
  });

  it("throws on an unknown missionId", async () => {
    await expect(modifyMission("nope", { title: "x" })).rejects.toThrow("MISSION_NOT_FOUND");
  });

  it("logs a MISSION_MODIFIED event carrying the changes", async () => {
    const mission = await createMission({ title: "Get promoted" });
    await modifyMission(mission.id, { title: "Get promoted fast" });
    const history = await getMissionHistory(mission.id);
    expect(history.map((e) => e.type)).toEqual(["MISSION_CREATED", "MISSION_MODIFIED"]);
    expect((history[1]!.payload as { changes: { title?: string } }).changes.title).toBe("Get promoted fast");
  });
});

describe("archiveMission", () => {
  it("moves an ACTIVE mission to ARCHIVED and out of getActiveMissions", async () => {
    const mission = await createMission({ title: "Get promoted" });
    await archiveMission(mission.id);
    const fetched = await getMission(mission.id);
    expect(fetched!.status).toBe("ARCHIVED");
    expect(await getActiveMissions()).toHaveLength(0);
    expect(await getMissions()).toHaveLength(1); // archived, not deleted
  });

  it("is idempotent — archiving an already-archived mission is a no-op, not an error", async () => {
    const mission = await createMission({ title: "Get promoted" });
    await archiveMission(mission.id);
    await expect(archiveMission(mission.id)).resolves.not.toThrow();
    const history = await getMissionHistory(mission.id);
    expect(history.filter((e) => e.type === "MISSION_ARCHIVED")).toHaveLength(1);
  });

  it("throws on an unknown missionId", async () => {
    await expect(archiveMission("nope")).rejects.toThrow("MISSION_NOT_FOUND");
  });
});

describe("no derived state is ever stored on a Mission", () => {
  it("the canonical record has no priority/score/urgency/attention field", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const keys = Object.keys(mission);
    for (const forbidden of ["priority", "score", "urgency", "attention", "overdue"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
