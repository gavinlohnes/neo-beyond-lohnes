import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { getGuidedMoreStarts, moreStartsFromCounts } from "../../src/application/guidedMoreQueries";
import { captureItem, resolveCaptureItem } from "../../src/application/commands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { archiveMission, createMission, createObligation, satisfyObligation } from "../../src/application/intentCommands";

beforeEach(async () => { await db.open(); });
afterEach(() => { vi.useRealTimers(); db.close(); });

describe("Guided MORE — stable navigation aids, not recommendations", () => {
  it("always returns exactly two fixed slots and truthful generic starts without records", async () => {
    const before = await db.events.toArray();
    const starts = await getGuidedMoreStarts();
    expect(starts.map((start) => start.id)).toEqual(["reflection", "direction"]);
    expect(starts.map((start) => start.destination)).toEqual(["JOURNAL", "INTENT"]);
    expect(starts.every((start) => start.basis.startsWith("Optional starting point:"))).toBe(true);
    expect(await db.events.toArray()).toEqual(before);
  });
  it("reads canonical state, excludes archived-parent commitments and changes only with meaningful records", async () => {
    const note = await captureItem("Synthetic memory");
    const archived = await createMission({ title: "Past direction" });
    await createObligation({ title: "Historical unresolved", missionId: archived.id });
    await archiveMission(archived.id);
    const mission = await createMission({ title: "Current direction" });
    const task = await createObligation({ title: "Concrete step", missionId: mission.id });
    const before = await db.events.toArray();
    const first = await getGuidedMoreStarts();
    expect(first[0]).toMatchObject({ destination: "CAPTURE" });
    expect(first[0].basis).toContain("1 unresolved note");
    expect(first[1].basis).toContain("1 unresolved commitment eligible");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-01-01T12:00:00Z"));
    expect(await getGuidedMoreStarts()).toEqual(first);
    expect(await db.events.toArray()).toEqual(before);
    const decision = await createDecisionJournalEntry({ title: "Choice", decision: "Choose a shorter step" });
    expect((await getGuidedMoreStarts())[0].basis).toContain("1 decision awaits review");
    await reviewDecisionJournalEntry(decision.id, { outcome: "Recorded outcome" });
    await resolveCaptureItem(note.id);
    await satisfyObligation(task.id);
    const final = await getGuidedMoreStarts();
    expect(final[0].basis).toContain("Optional starting point:");
    expect(final[1].basis).toContain("1 active mission");
  });
  it("uses deterministic precedence without urgency, due dates, scores or synthetic facts", () => {
    const counts = Object.freeze({ decisions: 2, captures: 9, obligations: 3, missions: 4 });
    expect(moreStartsFromCounts(counts)).toEqual(moreStartsFromCounts(counts));
    expect(moreStartsFromCounts(counts)[0].destination).toBe("JOURNAL");
    expect(moreStartsFromCounts(counts)[1].basis).toContain("not an urgency ranking");
    expect(counts).toEqual({ decisions: 2, captures: 9, obligations: 3, missions: 4 });
  });
});
