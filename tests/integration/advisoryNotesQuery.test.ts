import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { createObligation, markObligationWaiting } from "../../src/application/intentCommands";
import { getAdvisoryNotes } from "../../src/application/advisoryQueries";

/**
 * Intelligence Spine — I2 (controlled consumption proof, approved
 * 2026-08-22). Proves the application-layer seam (getAdvisoryNotes) wires
 * real Obligation data through I1's unchanged composer correctly, without
 * reimplementing any classification itself. Same real-Dexie/fake-indexeddb
 * pattern as tests/integration/obligationLifecycle.test.ts.
 */

const TODAY = new Date("2026-08-20T12:00:00.000Z");

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getAdvisoryNotes", () => {
  it("no-note state: no unresolved obligations -> empty array", async () => {
    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("no-note state: only non-attention-worthy obligations -> empty array", async () => {
    await createObligation({ title: "Someday", dueAt: "2026-09-30" }); // far beyond DUE_SOON window -> QUIET
    expect(await getAdvisoryNotes(TODAY)).toEqual([]);
  });

  it("an OVERDUE obligation produces exactly one AdvisoryNote, attributed and traceable", async () => {
    const obligation = await createObligation({ title: "Renew passport", dueAt: "2026-08-01" });
    const notes = await getAdvisoryNotes(TODAY);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.sourceModule).toBe("obligationRelevance");
    expect(notes[0]!.message).toBe("Renew passport — OVERDUE");
    expect(notes[0]!.basis).toEqual(
      expect.arrayContaining([
        { key: "obligationId", value: obligation.id },
        { key: "tier", value: "OVERDUE" },
      ]),
    );
  });

  it("multiple qualifying obligations each produce a note; a WAITING one does not", async () => {
    await createObligation({ title: "Overdue thing", dueAt: "2026-08-10" });
    await createObligation({ title: "Due today thing", dueAt: "2026-08-20" });
    const waiting = await createObligation({ title: "Waiting thing", dueAt: "2026-08-01" });
    await markObligationWaiting(waiting.id);

    const notes = await getAdvisoryNotes(TODAY);
    expect(notes.map((n) => n.message).sort()).toEqual(["Due today thing — DUE_TODAY", "Overdue thing — OVERDUE"].sort());
  });
});
