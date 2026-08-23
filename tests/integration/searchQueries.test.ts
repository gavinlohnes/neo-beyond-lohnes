import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { captureItem, resolveCaptureItem } from "../../src/application/commands";
import { archiveMission, createMission, createObligation, satisfyObligation } from "../../src/application/intentCommands";
import { searchAll } from "../../src/application/searchQueries";

/**
 * Personal Search 1.0 (Post-FIELD Capability Acceleration Campaign,
 * Slice 2). Plain case-insensitive substring retrieval over Mission/
 * Obligation/Capture text — every status included (retrieval, not
 * current-attention eligibility), no mutation, no new persistence.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(() => {
  db.close();
});

describe("searchAll", () => {
  it("returns nothing for an empty or whitespace-only query", async () => {
    await createMission({ title: "Rebuild the deck" });
    expect(await searchAll("")).toEqual([]);
    expect(await searchAll("   ")).toEqual([]);
  });

  it("matches a Mission by title, case-insensitively", async () => {
    const mission = await createMission({ title: "Rebuild the deck" });
    const results = await searchAll("DECK");
    expect(results).toContainEqual(
      expect.objectContaining({ domain: "MISSION", id: mission.id, title: "Rebuild the deck", status: "ACTIVE" }),
    );
  });

  it("matches a Mission by description, not just title", async () => {
    const mission = await createMission({ title: "Q3 goals", description: "Focus on the garage rebuild" });
    const results = await searchAll("garage");
    expect(results).toContainEqual(expect.objectContaining({ domain: "MISSION", id: mission.id }));
  });

  it("matches an Obligation by title and reflects its real status", async () => {
    const obligation = await createObligation({ title: "Call the electrician" });
    await satisfyObligation(obligation.id);
    const results = await searchAll("electrician");
    expect(results).toContainEqual(
      expect.objectContaining({ domain: "OBLIGATION", id: obligation.id, status: "SATISFIED" }),
    );
  });

  it("matches a Capture item by its text and reflects RESOLVED status honestly", async () => {
    const item = await captureItem("Remember to renew the car registration");
    await resolveCaptureItem(item.id);
    const results = await searchAll("registration");
    expect(results).toContainEqual(
      expect.objectContaining({ domain: "CAPTURE", id: item.id, title: "Remember to renew the car registration", status: "RESOLVED" }),
    );
  });

  it("includes an ARCHIVED Mission — retrieval is not current-attention eligibility", async () => {
    const mission = await createMission({ title: "Old kitchen project" });
    await archiveMission(mission.id);
    const results = await searchAll("kitchen");
    expect(results).toContainEqual(expect.objectContaining({ domain: "MISSION", id: mission.id, status: "ARCHIVED" }));
  });

  it("returns no results for a query that matches nothing", async () => {
    await createMission({ title: "Rebuild the deck" });
    expect(await searchAll("xyzzy-no-match")).toEqual([]);
  });

  it("performs no writes — pure retrieval", async () => {
    await createMission({ title: "Rebuild the deck" });
    const missionCountBefore = await db.missions.count();
    const eventCountBefore = await db.events.count();

    await searchAll("deck");

    expect(await db.missions.count()).toBe(missionCountBefore);
    expect(await db.events.count()).toBe(eventCountBefore);
  });
});
