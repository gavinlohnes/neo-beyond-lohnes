import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { captureItem } from "../../src/application/commands";
import { archiveMission, convertCaptureToObligation, createMission } from "../../src/application/intentCommands";

/**
 * Capture Processing, Slice 3 (Post-FIELD Capability Acceleration
 * Campaign). Provenance-tracked: sourceCaptureId lives on the
 * OBLIGATION_CREATED event payload only, never the canonical Obligation
 * record. Ordering is the safety story — createObligation must succeed
 * before the capture is ever touched, and failure must leave the capture
 * fully recoverable.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(() => {
  db.close();
});

describe("convertCaptureToObligation", () => {
  it("creates exactly one Obligation and resolves the originating Capture", async () => {
    const capture = await captureItem("Renew the car registration");

    const obligation = await convertCaptureToObligation(capture.id, { title: "Renew car registration" });

    expect(obligation.title).toBe("Renew car registration");
    expect(obligation.status).toBe("OPEN");
    expect(await db.obligations.count()).toBe(1);

    const stored = await db.captureItems.get(capture.id);
    expect(stored?.status).toBe("RESOLVED");
    expect(stored?.resolvedAt).toBeTypeOf("string");
    // Original capture evidence is preserved, not rewritten.
    expect(stored?.text).toBe("Renew the car registration");
  });

  it("records provenance on the OBLIGATION_CREATED event payload only, never on the canonical Obligation", async () => {
    const capture = await captureItem("Call the electrician");
    const obligation = await convertCaptureToObligation(capture.id, { title: "Call the electrician" });

    expect(obligation).not.toHaveProperty("sourceCaptureId");

    const events = await db.events.where("obligationId").equals(obligation.id).toArray();
    const created = events.find((e) => e.type === "OBLIGATION_CREATED");
    expect(created).toBeDefined();
    expect((created!.payload as { sourceCaptureId?: string }).sourceCaptureId).toBe(capture.id);
  });

  it("does not set sourceCaptureId for an ordinary (non-handoff) Obligation creation", async () => {
    const { createObligation } = await import("../../src/application/intentCommands");
    const obligation = await createObligation({ title: "Manually added obligation" });
    const events = await db.events.where("obligationId").equals(obligation.id).toArray();
    const created = events.find((e) => e.type === "OBLIGATION_CREATED");
    expect((created!.payload as { sourceCaptureId?: string }).sourceCaptureId).toBeUndefined();
  });

  it("produces no Recommendation and no unrelated BeyondDay event", async () => {
    const capture = await captureItem("Book the dentist");
    const recommendationCountBefore = await db.recommendations.count();
    const eventCountBefore = await db.events.count();

    await convertCaptureToObligation(capture.id, { title: "Book the dentist" });

    expect(await db.recommendations.count()).toBe(recommendationCountBefore);
    // Exactly one new event (OBLIGATION_CREATED) — resolveCaptureItem logs none (see captureInbox.test.ts).
    expect(await db.events.count()).toBe(eventCountBefore + 1);
  });

  it("does not infer a due date, planned date, or Mission link", async () => {
    const capture = await captureItem("Something vague");
    const obligation = await convertCaptureToObligation(capture.id, { title: "Something vague" });
    expect(obligation.dueAt).toBeUndefined();
    expect(obligation.plannedAt).toBeUndefined();
    expect(obligation.missionId).toBeUndefined();
  });

  it("leaves the Capture fully recoverable when the Obligation cannot be created (invalid input)", async () => {
    const capture = await captureItem("Needs a real title");

    await expect(convertCaptureToObligation(capture.id, { title: "" })).rejects.toThrow();

    const stored = await db.captureItems.get(capture.id);
    expect(stored?.status).toBe("OPEN");
    expect(await db.obligations.count()).toBe(0);
  });

  it("leaves the Capture fully recoverable when the target Mission is archived", async () => {
    const mission = await createMission({ title: "Old project" });
    await archiveMission(mission.id);
    const capture = await captureItem("Follow up on the old project");

    await expect(
      convertCaptureToObligation(capture.id, { title: "Follow up", missionId: mission.id }),
    ).rejects.toThrow(/MISSION_ARCHIVED/);

    const stored = await db.captureItems.get(capture.id);
    expect(stored?.status).toBe("OPEN");
    expect(await db.obligations.count()).toBe(0);
  });

  it("rejects a nonexistent capture without creating an orphan Obligation", async () => {
    await expect(convertCaptureToObligation("no-such-id", { title: "X" })).rejects.toThrow(/CAPTURE_NOT_FOUND/);
    expect(await db.obligations.count()).toBe(0);
  });

  it("rejects converting an already-resolved capture", async () => {
    const capture = await captureItem("Already handled");
    await convertCaptureToObligation(capture.id, { title: "Already handled" });

    await expect(convertCaptureToObligation(capture.id, { title: "Again" })).rejects.toThrow(/CAPTURE_NOT_OPEN/);
    expect(await db.obligations.count()).toBe(1);
  });
});
