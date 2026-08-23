import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { archiveMission, createMission, createObligation } from "../../src/application/intentCommands";
import { getMissionForObligation } from "../../src/application/intentQueries";
import { db } from "../../src/persistence/db";

beforeEach(async () => {
  await db.open();
});

afterEach(() => {
  db.close();
});

describe("getMissionForObligation", () => {
  it("returns the Mission named by the Obligation's exact missionId", async () => {
    const mission = await createMission({ title: "Build a durable career" });
    const obligation = await createObligation({ title: "Finish certification", missionId: mission.id });

    await expect(getMissionForObligation(obligation)).resolves.toEqual(mission);
  });

  it("returns nothing for a standalone Obligation", async () => {
    const obligation = await createObligation({ title: "Renew passport" });

    await expect(getMissionForObligation(obligation)).resolves.toBeUndefined();
  });

  it("fails quietly when an explicit Mission reference no longer resolves", async () => {
    const mission = await createMission({ title: "Build a durable career" });
    const obligation = await createObligation({ title: "Finish certification", missionId: mission.id });
    await db.missions.delete(mission.id);

    await expect(getMissionForObligation(obligation)).resolves.toBeUndefined();
  });

  it("preserves archived Mission context because archiving does not remove the explicit relationship", async () => {
    const mission = await createMission({ title: "Build a durable career" });
    const obligation = await createObligation({ title: "Finish certification", missionId: mission.id });
    await archiveMission(mission.id);

    const context = await getMissionForObligation(obligation);
    expect(context?.title).toBe("Build a durable career");
    expect(context?.status).toBe("ARCHIVED");
  });
});
