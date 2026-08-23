import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  archiveMission,
  createMission,
  createObligation,
  modifyObligation,
} from "../../src/application/intentCommands";
import {
  getCurrentlyEligibleUnresolvedObligations,
  getUnresolvedObligations,
} from "../../src/application/intentQueries";

/**
 * Intent Lifecycle Integrity — owner-approved correction (2026-08-23, see
 * docs/UX_DECISIONS.md "Intent & Commitment — Mission archival and
 * Obligation current-attention eligibility"). The semantic-chain
 * regression covering the exact defect the FIELD evidence surfaced, plus
 * the write-side invariant. Same real-Dexie/fake-indexeddb pattern as
 * tests/integration/obligationLifecycle.test.ts.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("semantic chain: Mission creation -> linked unresolved Obligation -> Mission archive", () => {
  it("raw unresolved (management) still includes it; current-eligible excludes it", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const obligation = await createObligation({ title: "Finish cert", missionId: mission.id, dueAt: "2020-01-01" });

    // Before archival: both views agree.
    expect((await getUnresolvedObligations()).map((o) => o.id)).toContain(obligation.id);
    expect((await getCurrentlyEligibleUnresolvedObligations()).map((o) => o.id)).toContain(obligation.id);

    await archiveMission(mission.id);

    // After archival: raw/management still sees it (operator must be able
    // to find and act on it) — status is untouched, still OPEN.
    const raw = await getUnresolvedObligations();
    expect(raw.map((o) => o.id)).toContain(obligation.id);
    expect(raw.find((o) => o.id === obligation.id)!.status).toBe("OPEN");

    // Current-eligible excludes it — this is the actual fix.
    const eligible = await getCurrentlyEligibleUnresolvedObligations();
    expect(eligible.map((o) => o.id)).not.toContain(obligation.id);
  });

  it("archiving a Mission never mutates a linked Obligation's status, resolvedAt, or resolutionNote", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const obligation = await createObligation({ title: "Finish cert", missionId: mission.id });
    await archiveMission(mission.id);

    const raw = await getUnresolvedObligations();
    const stillThere = raw.find((o) => o.id === obligation.id)!;
    expect(stillThere.status).toBe("OPEN");
    expect(stillThere.resolvedAt).toBeUndefined();
    expect(stillThere.resolutionNote).toBeUndefined();
  });

  it("a standalone Obligation (no Mission) is unaffected by any Mission's lifecycle", async () => {
    const obligation = await createObligation({ title: "Standalone", dueAt: "2020-01-01" });
    const mission = await createMission({ title: "Unrelated" });
    await archiveMission(mission.id);

    expect((await getCurrentlyEligibleUnresolvedObligations()).map((o) => o.id)).toContain(obligation.id);
  });

  it("an ACTIVE Mission's linked Obligation is unaffected — behaves exactly as before", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const obligation = await createObligation({ title: "Finish cert", missionId: mission.id, dueAt: "2020-01-01" });

    expect((await getCurrentlyEligibleUnresolvedObligations()).map((o) => o.id)).toContain(obligation.id);
  });
});

describe("write-side invariant: linking to an ARCHIVED Mission is rejected", () => {
  it("createObligation rejects a missionId pointing to an already-archived Mission", async () => {
    const mission = await createMission({ title: "Get promoted" });
    await archiveMission(mission.id);

    await expect(createObligation({ title: "New work", missionId: mission.id })).rejects.toThrow("MISSION_ARCHIVED");
  });

  it("modifyObligation rejects newly linking to an already-archived Mission", async () => {
    const mission = await createMission({ title: "Get promoted" });
    await archiveMission(mission.id);
    const obligation = await createObligation({ title: "Standalone" });

    await expect(modifyObligation(obligation.id, { missionId: mission.id })).rejects.toThrow("MISSION_ARCHIVED");
  });

  it("modifyObligation does NOT reject a save that leaves an existing archived-Mission link untouched", async () => {
    const mission = await createMission({ title: "Get promoted" });
    const obligation = await createObligation({ title: "Finish cert", missionId: mission.id });
    await archiveMission(mission.id);

    // No missionId in this call at all -> existing (now-stale) link must
    // not be disturbed or rejected; only a caller-supplied new missionId
    // triggers the guard.
    const updated = await modifyObligation(obligation.id, { title: "Finish cert (renamed)" });
    expect(updated.missionId).toBe(mission.id);
  });

  it("modifyObligation allows re-linking to a DIFFERENT ACTIVE Mission even while the old link is archived", async () => {
    const oldMission = await createMission({ title: "Old direction" });
    const newMission = await createMission({ title: "New direction" });
    const obligation = await createObligation({ title: "Finish cert", missionId: oldMission.id });
    await archiveMission(oldMission.id);

    const updated = await modifyObligation(obligation.id, { missionId: newMission.id });
    expect(updated.missionId).toBe(newMission.id);
    expect((await getCurrentlyEligibleUnresolvedObligations()).map((o) => o.id)).toContain(obligation.id);
  });

  it("passing missionId: undefined is a no-op on that field (existing modify semantics), not a rejection — an existing archived-Mission link is left untouched", async () => {
    // Note: modifyObligation has no way to CLEAR an existing missionId —
    // `undefined` is indistinguishable from "field not supplied" (see
    // `parsed.missionId !== undefined` above). Full detachment back to
    // standalone is not a capability this Drop adds; only re-linking to a
    // different Mission is exercised above.
    const mission = await createMission({ title: "Get promoted" });
    const obligation = await createObligation({ title: "Finish cert", missionId: mission.id });
    await archiveMission(mission.id);

    const updated = await modifyObligation(obligation.id, { title: "Finish cert", missionId: undefined });
    expect(updated.missionId).toBe(mission.id);
  });
});
