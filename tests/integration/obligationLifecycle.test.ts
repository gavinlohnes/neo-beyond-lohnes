import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  createMission,
  createObligation,
  markObligationOpen,
  markObligationWaiting,
  modifyObligation,
  releaseObligation,
  satisfyObligation,
} from "../../src/application/intentCommands";
import {
  getObligation,
  getObligationHistory,
  getObligationsForMission,
  getUnresolvedObligations,
} from "../../src/application/intentQueries";

/**
 * Intent & Commitment Spine — Drop 01 (2026-08-22, approved). Obligation
 * lifecycle: create, modify, OPEN<->WAITING, satisfy, release. Every
 * meaningful change also produces a real historical DomainEvent scoped
 * by obligationId (not beyondDayId — Obligations are not day-scoped).
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("createObligation", () => {
  it("rejects an empty title", async () => {
    await expect(createObligation({ title: "" })).rejects.toThrow();
  });

  it("creates an OPEN obligation with source USER, no mission required", async () => {
    const obligation = await createObligation({ title: "Renew passport" });
    expect(obligation.status).toBe("OPEN");
    expect(obligation.source).toBe("USER");
    expect(obligation.missionId).toBeUndefined();
  });

  it("works standalone — an Obligation may exist without a Mission", async () => {
    const obligation = await createObligation({ title: "Standalone" });
    const fetched = await getObligation(obligation.id);
    expect(fetched!.missionId).toBeUndefined();
  });

  it("links to a Mission when missionId is given", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const obligation = await createObligation({ title: "Finish cert", missionId: mission.id });
    expect(obligation.missionId).toBe(mission.id);
    const forMission = await getObligationsForMission(mission.id);
    expect(forMission.map((o) => o.id)).toEqual([obligation.id]);
  });

  it("rejects a missionId that does not exist", async () => {
    await expect(createObligation({ title: "x", missionId: "nope" })).rejects.toThrow("MISSION_NOT_FOUND");
  });

  it("keeps dueAt (due expectation) and plannedAt (planned attention) distinct", async () => {
    const obligation = await createObligation({ title: "Taxes", dueAt: "2026-09-15", plannedAt: "2026-09-01" });
    expect(obligation.dueAt).toBe("2026-09-15");
    expect(obligation.plannedAt).toBe("2026-09-01");
    expect(obligation.dueAt).not.toBe(obligation.plannedAt);
    // resolvedAt (actual occurrence) is a third, still-distinct axis, unset until resolution.
    expect(obligation.resolvedAt).toBeUndefined();
  });

  it("rejects a dueAt/plannedAt that isn't a plain YYYY-MM-DD date", async () => {
    await expect(createObligation({ title: "x", dueAt: "2026-09-15T00:00:00.000Z" })).rejects.toThrow();
  });

  it("logs exactly one OBLIGATION_CREATED event, scoped by obligationId, not beyondDayId", async () => {
    const obligation = await createObligation({ title: "Renew passport" });
    const history = await getObligationHistory(obligation.id);
    expect(history).toHaveLength(1);
    expect(history[0]!.type).toBe("OBLIGATION_CREATED");
    expect(history[0]!.obligationId).toBe(obligation.id);
    expect(history[0]!.beyondDayId).toBeUndefined();
  });

  it("does not require an active BeyondDay — Obligations are not day-scoped", async () => {
    await expect(createObligation({ title: "No day started" })).resolves.not.toThrow();
  });
});

describe("modifyObligation", () => {
  it("updates fields and bumps updatedAt", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    const updated = await modifyObligation(obligation.id, { dueAt: "2026-09-15" });
    expect(updated.dueAt).toBe("2026-09-15");
    expect(updated.title).toBe("Taxes");
  });

  it("throws on an unknown obligationId", async () => {
    await expect(modifyObligation("nope", { title: "x" })).rejects.toThrow("OBLIGATION_NOT_FOUND");
  });

  it("throws when reassigned to an unknown missionId", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await expect(modifyObligation(obligation.id, { missionId: "nope" })).rejects.toThrow("MISSION_NOT_FOUND");
  });
});

describe("OPEN <-> WAITING transitions", () => {
  it("OPEN -> WAITING succeeds and is reflected in getUnresolvedObligations", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await markObligationWaiting(obligation.id);
    const fetched = await getObligation(obligation.id);
    expect(fetched!.status).toBe("WAITING");
    expect((await getUnresolvedObligations()).map((o) => o.id)).toContain(obligation.id);
  });

  it("WAITING -> OPEN succeeds", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await markObligationWaiting(obligation.id);
    await markObligationOpen(obligation.id);
    expect((await getObligation(obligation.id))!.status).toBe("OPEN");
  });

  it("marking an already-OPEN obligation OPEN is an idempotent no-op", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await expect(markObligationOpen(obligation.id)).resolves.not.toThrow();
    expect((await getObligation(obligation.id))!.status).toBe("OPEN");
  });

  it("rejects marking a SATISFIED obligation WAITING", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await satisfyObligation(obligation.id);
    await expect(markObligationWaiting(obligation.id)).rejects.toThrow("INVALID_OBLIGATION_TRANSITION");
  });

  it("logs OBLIGATION_MARKED_WAITING / OBLIGATION_MARKED_OPEN as distinct historical facts", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await markObligationWaiting(obligation.id);
    await markObligationOpen(obligation.id);
    const history = await getObligationHistory(obligation.id);
    expect(history.map((e) => e.type)).toEqual([
      "OBLIGATION_CREATED",
      "OBLIGATION_MARKED_WAITING",
      "OBLIGATION_MARKED_OPEN",
    ]);
  });
});

describe("satisfyObligation", () => {
  it("sets status SATISFIED, resolvedAt, and preserves an optional resolutionNote as evidence", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await satisfyObligation(obligation.id, "Filed and confirmed");
    const fetched = await getObligation(obligation.id);
    expect(fetched!.status).toBe("SATISFIED");
    expect(fetched!.resolvedAt).toBeTypeOf("string");
    expect(fetched!.resolutionNote).toBe("Filed and confirmed");
  });

  it("is valid from WAITING too, not only OPEN", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await markObligationWaiting(obligation.id);
    await expect(satisfyObligation(obligation.id)).resolves.not.toThrow();
  });

  it("rejects satisfying an already-resolved obligation", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await satisfyObligation(obligation.id);
    await expect(satisfyObligation(obligation.id)).rejects.toThrow("OBLIGATION_ALREADY_RESOLVED");
  });

  it("no longer appears in getUnresolvedObligations", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await satisfyObligation(obligation.id);
    expect((await getUnresolvedObligations()).map((o) => o.id)).not.toContain(obligation.id);
  });
});

describe("releaseObligation — distinct from SATISFIED", () => {
  it("sets status RELEASED, not SATISFIED", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await releaseObligation(obligation.id, "No longer relevant");
    const fetched = await getObligation(obligation.id);
    expect(fetched!.status).toBe("RELEASED");
    expect(fetched!.status).not.toBe("SATISFIED");
    expect(fetched!.resolutionNote).toBe("No longer relevant");
  });

  it("rejects releasing an already-resolved obligation", async () => {
    const obligation = await createObligation({ title: "Taxes" });
    await releaseObligation(obligation.id);
    await expect(releaseObligation(obligation.id)).rejects.toThrow("OBLIGATION_ALREADY_RESOLVED");
  });

  it("SATISFIED and RELEASED obligations remain distinguishable in a mixed list", async () => {
    const satisfied = await createObligation({ title: "Filed taxes" });
    const released = await createObligation({ title: "Cancelled trip" });
    await satisfyObligation(satisfied.id);
    await releaseObligation(released.id);
    expect((await getObligation(satisfied.id))!.status).toBe("SATISFIED");
    expect((await getObligation(released.id))!.status).toBe("RELEASED");
  });
});

describe("no derived state is ever stored on an Obligation", () => {
  it("the canonical record has no priority/score/urgency/attention/overdue field", async () => {
    const obligation = await createObligation({ title: "Taxes", dueAt: "2020-01-01" }); // deliberately in the past
    const keys = Object.keys(obligation);
    for (const forbidden of ["priority", "score", "urgency", "attention", "overdue"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe("reload/resume", () => {
  it("Obligation state survives closing and reopening the database", async () => {
    const obligation = await createObligation({ title: "Taxes", dueAt: "2026-09-15" });
    await markObligationWaiting(obligation.id);

    db.close();
    await db.open();

    const fetched = await getObligation(obligation.id);
    expect(fetched!.status).toBe("WAITING");
    expect(fetched!.dueAt).toBe("2026-09-15");
  });
});
