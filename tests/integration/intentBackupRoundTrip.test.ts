import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import {
  archiveMission,
  createMission,
  createObligation,
  markObligationWaiting,
  satisfyObligation,
} from "../../src/application/intentCommands";
import { getMission, getMissionHistory, getObligation, getObligationHistory } from "../../src/application/intentQueries";

/**
 * Intent & Commitment Spine — Drop 01 (2026-08-22, approved), section 9:
 * "Prove that a backup containing Mission/Obligation state can round-trip
 * without semantic loss." dexie-export-import handles missions/
 * obligations generically (same as schedulePatterns/captureItems before
 * them) — no backup.ts/restore.ts changes were needed; this proves that
 * holds in practice, not just in theory.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("Mission/Obligation state round-trips through native export/import", () => {
  it("preserves canonical state, status, relationships, and historical events exactly", async () => {
    const mission = await createMission({ title: "Get promoted", description: "By Q4" });
    const linked = await createObligation({
      title: "Finish certification",
      missionId: mission.id,
      dueAt: "2026-09-15",
    });
    const standalone = await createObligation({ title: "Renew passport" });
    await markObligationWaiting(linked.id);
    await satisfyObligation(standalone.id, "Renewed in person");
    await archiveMission(mission.id);

    const blob = await db.export({ prettyJson: true });
    const nativeFile = new File([blob], "native-backup.json", { type: "application/json" });

    const preview = await previewAnyRestore(nativeFile);
    expect(preview.format).toBe("NATIVE");
    if (preview.format === "NATIVE") {
      expect(preview.tables.some((t) => t.name === "missions" && t.rowCount === 1)).toBe(true);
      expect(preview.tables.some((t) => t.name === "obligations" && t.rowCount === 2)).toBe(true);
    }

    // Diverge current state so the restore has something real to undo,
    // matching the existing restore round-trip tests' own pattern.
    await createMission({ title: "A different mission entirely" });

    await applyAnyRestore(nativeFile);

    const restoredMission = await getMission(mission.id);
    expect(restoredMission).toEqual({ ...mission, status: "ARCHIVED", updatedAt: restoredMission!.updatedAt });

    const restoredLinked = await getObligation(linked.id);
    expect(restoredLinked!.status).toBe("WAITING");
    expect(restoredLinked!.missionId).toBe(mission.id);
    expect(restoredLinked!.dueAt).toBe("2026-09-15");

    const restoredStandalone = await getObligation(standalone.id);
    expect(restoredStandalone!.status).toBe("SATISFIED");
    expect(restoredStandalone!.resolutionNote).toBe("Renewed in person");
    expect(restoredStandalone!.resolvedAt).toBeTypeOf("string");

    const missionHistory = await getMissionHistory(mission.id);
    expect(missionHistory.map((e) => e.type)).toEqual(["MISSION_CREATED", "MISSION_ARCHIVED"]);

    const obligationHistory = await getObligationHistory(standalone.id);
    expect(obligationHistory.map((e) => e.type)).toEqual(["OBLIGATION_CREATED", "OBLIGATION_SATISFIED"]);
  });
});
