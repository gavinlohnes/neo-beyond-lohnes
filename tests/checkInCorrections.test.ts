import { describe, expect, it } from "vitest";
import { checkInChains, effectiveCheckIns, hiddenCheckInIds, chainForCheckIn } from "../src/domain/checkInCorrections";
import type { DomainEvent, StateCheckIn } from "../src/domain/common/types";

/** GRAYSON-CHECKIN-EDIT-001: which check-ins count after fixes and undos. Pure; invented data. */
let seq = 0;
const at = (minute: number) => new Date(Date.UTC(2026, 10, 24, 8, minute)).toISOString();
function checkIn(id: string, energy: StateCheckIn["energy"], minute = 0, correctsCheckInId?: string): StateCheckIn {
  return { id, beyondDayId: "d1", recordedAt: at(minute), energy, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0, ...(correctsCheckInId ? { correctsCheckInId } : {}) };
}
function event(id: string, type: DomainEvent["type"], payload: unknown, minute: number): DomainEvent {
  return { id, type, beyondDayId: "d1", occurredAt: at(minute), recordedAt: at(minute), payload, source: "USER", correlationId: id, seq: ++seq };
}
const sent = (c: StateCheckIn, minute: number) => event(`e-${c.id}`, "STATE_CHECKED_IN", c, minute);
const fixed = (id: string, original: string, supersedes: string, row: StateCheckIn, minute: number) =>
  event(id, "CHECK_IN_CORRECTED", { commandId: id, originalCheckInId: original, supersedesCheckInId: supersedes, checkIn: row }, minute);
const undone = (id: string, correctionEventId: string, minute: number) => event(id, "CHECK_IN_CORRECTION_UNDONE", { commandId: id, correctionEventId }, minute);

describe("effectiveCheckIns", () => {
  const a = checkIn("a", 2, 0);
  const b = checkIn("b", 3, 10);

  it("a day with no fixes reads exactly as before", () => {
    const events = [sent(a, 0), sent(b, 10)];
    expect(effectiveCheckIns(events)).toEqual([a, b]);
    expect(hiddenCheckInIds(events).size).toBe(0);
    expect(checkInChains(events).map((c) => c.at)).toEqual([at(0), at(10)]);
  });

  it("a fix counts and the original doesn't; the count stays the same", () => {
    const a2 = checkIn("a2", 4, 0, "a");
    const events = [sent(a, 0), sent(b, 10), fixed("f1", "a", "a", a2, 20)];
    expect(effectiveCheckIns(events)).toEqual([a2, b]);
    expect([...hiddenCheckInIds(events)]).toEqual(["a"]);
    const chain = checkInChains(events)[0]!;
    expect(chain.at).toBe(at(0));
    expect(chain.fixes).toEqual([{ eventId: "f1", at: at(20), before: a, after: a2 }]);
  });

  it("fix twice: the newest counts", () => {
    const a2 = checkIn("a2", 4, 0, "a");
    const a3 = checkIn("a3", 5, 0, "a2");
    const events = [sent(a, 0), fixed("f1", "a", "a", a2, 20), fixed("f2", "a", "a2", a3, 30)];
    expect(effectiveCheckIns(events)).toEqual([a3]);
    expect(hiddenCheckInIds(events)).toEqual(new Set(["a", "a2"]));
    expect(checkInChains(events)[0]!.fixes.map((f) => [f.before.id, f.after.id])).toEqual([["a", "a2"], ["a2", "a3"]]);
  });

  it("undo: the answers from before the fix count again", () => {
    const a2 = checkIn("a2", 4, 0, "a");
    const a3 = checkIn("a3", 5, 0, "a2");
    const once = [sent(a, 0), fixed("f1", "a", "a", a2, 20), undone("u1", "f1", 25)];
    expect(effectiveCheckIns(once)).toEqual([a]);
    expect(hiddenCheckInIds(once)).toEqual(new Set(["a2"]));
    const twice = [sent(a, 0), fixed("f1", "a", "a", a2, 20), fixed("f2", "a", "a2", a3, 30), undone("u2", "f2", 35)];
    expect(effectiveCheckIns(twice)).toEqual([a2]);
    expect(checkInChains(twice)[0]!.fixes.map((f) => f.eventId)).toEqual(["f1"]);
  });

  it("any row of a chain, the original included, finds the chain and its current answers", () => {
    const a2 = checkIn("a2", 4, 0, "a");
    const chains = checkInChains([sent(a, 0), sent(b, 10), fixed("f1", "a", "a", a2, 20)]);
    expect(chainForCheckIn(chains, "a")?.current).toEqual(a2);
    expect(chainForCheckIn(chains, "a2")?.current).toEqual(a2);
    expect(chainForCheckIn(chains, "b")?.current).toEqual(b);
    expect(chainForCheckIn(chains, "nope")).toBeUndefined();
  });
});
