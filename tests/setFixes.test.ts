import { describe, expect, it } from "vitest";
import type { DomainEvent } from "../src/domain/common/types";
import { newestStandingFix, projectSetFixes } from "../src/domain/workout/setFixes";

/** GRAYSON-TRAIN-EDIT-001: the one projection of set fixes, pure. */
let seq = 0;
const ev = (type: DomainEvent["type"], payload: object, id = `e${seq + 1}`): DomainEvent => {
  seq += 1;
  return { id, type, beyondDayId: "d1", occurredAt: `2026-11-24T0${Math.min(9, seq)}:00:00.000Z`, recordedAt: `2026-11-24T0${Math.min(9, seq)}:00:00.000Z`, payload, source: "USER", correlationId: id, seq };
};
const base = { commandId: "c", sessionId: "s", exerciseId: "x", setNumber: 1 };
const values = (weight: number) => ({ weight, reps: 10, skipped: false });
const corrected = (from: string, to: string, id: string) => ev("SET_CORRECTED", { ...base, replacesSetId: from, newPerformedSetId: to, before: values(1), after: values(2) }, id);
const undo = (fixEventId: string, id: string) => ev("SET_FIX_UNDONE", { commandId: "c", fixEventId }, id);

describe("GRAYSON-TRAIN-EDIT-001 projectSetFixes", () => {
  it("a correction retracts the old row; twice, only the newest stands; undoing the newest brings the previous back", () => {
    const one = corrected("A", "B", "f1");
    expect([...projectSetFixes([one]).retractedSetIds]).toEqual(["A"]);
    const two = corrected("B", "C", "f2");
    let p = projectSetFixes([one, two]);
    expect([...p.retractedSetIds].sort()).toEqual(["A", "B"]);
    expect(p.rootOf.get("C")).toBe("A");
    expect(p.historyByRoot.get("A")!.map((f) => f.eventId)).toEqual(["f1", "f2"]);
    expect(newestStandingFix(p, "C")!.eventId).toBe("f2");
    p = projectSetFixes([one, two, undo("f2", "u1")]);
    expect([...p.retractedSetIds].sort()).toEqual(["A", "C"]);
    expect(newestStandingFix(p, "B")!.eventId).toBe("f1");
  });

  it("a removal retracts; undoing it brings the set back", () => {
    const removal = ev("SET_REMOVED", { ...base, performedSetId: "A" }, "r1");
    let p = projectSetFixes([removal]);
    expect(p.retractedSetIds.has("A")).toBe(true);
    expect(p.removed.get("A")!.eventId).toBe("r1");
    p = projectSetFixes([removal, undo("r1", "u2")]);
    expect(p.retractedSetIds.size).toBe(0);
    expect(p.removed.size).toBe(0);
  });

  it("an add stands until it is undone", () => {
    const add = ev("SET_ADDED", { ...base, performedSetId: "N", weight: 100, reps: 8 }, "a1");
    expect(projectSetFixes([add]).retractedSetIds.size).toBe(0);
    expect(projectSetFixes([add, undo("a1", "u3")]).retractedSetIds.has("N")).toBe(true);
  });

  it("SET_UNDONE behaves exactly as before", () => {
    const p = projectSetFixes([ev("SET_UNDONE", { ...base, performedSetId: "Z" }), ev("SET_LOGGED", { ...base, performedSetId: "Y" })]);
    expect([...p.retractedSetIds]).toEqual(["Z"]);
    expect(p.historyByRoot.size).toBe(0);
  });

  it("order comes from seq, and a malformed payload is ignored", () => {
    const later = corrected("B", "C", "f9");
    const earlier = corrected("A", "B", "f8");
    expect([...projectSetFixes([later, earlier]).retractedSetIds].sort()).toEqual(["A", "B"]);
    expect(projectSetFixes([ev("SET_CORRECTED", { nope: true }), ev("SET_REMOVED", null as unknown as object)]).retractedSetIds.size).toBe(0);
  });
});
