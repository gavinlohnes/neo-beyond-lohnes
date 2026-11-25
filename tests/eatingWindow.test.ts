import { describe, expect, it } from "vitest";
import { deriveEatingWindow, plannedOpening, presetLabel, readMarks, typicalContext, EATING_PRESETS, SAFETY_QUESTIONS, TYPICAL_LABEL } from "../src/application/eatingWindow";
import type { DomainEvent, EatingWindowSettings } from "../src/domain/common/types";

/** GRAYSON C4.8a · Eating Window foundation. Sat Nov 14 2026, night 2 (lived day from 16:30). */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const settings: EatingWindowSettings = { enabled: true, eatingHours: 10, opensAt: { WORK: "14:00", RECOVERY: "14:00", OFF: "10:00" }, safetyCheckedAt: "x", setAt: "x" };
const base = { settings, kind: "WORK" as const, dayStartedAt: at(14, 16, 30).toISOString(), marks: [], skipId: null };

describe("planned window follows the lived day", () => {
  it("a time before 16:30 lands on the lived day's second date; after, on its first", () => {
    expect(plannedOpening(at(14, 16, 30), "14:00")).toEqual(at(15, 14));
    expect(plannedOpening(at(14, 16, 30), "18:00")).toEqual(at(14, 18));
  });
  it("names presets by their hours, none above another", () => {
    expect(EATING_PRESETS.map((p) => p.label)).toEqual(["12:12", "14:10", "16:8", "18:6"]);
    expect(presetLabel(7)).toBe("17:7");
  });
});

describe("deriveEatingWindow", () => {
  it("is nothing when off or today's kind is unknown", () => {
    expect(deriveEatingWindow({ ...base, now: at(14, 20), settings: { ...settings, enabled: false } })).toBeNull();
    expect(deriveEatingWindow({ ...base, now: at(14, 20), kind: null })).toBeNull();
  });
  it("shows the plan before any mark", () => {
    expect(deriveEatingWindow({ ...base, now: at(14, 20) })).toEqual({ kind: "PLANNED", opensAt: "14:00", closesAt: "00:00" });
  });
  it("after he stops eating: a fast in progress, its elapsed time, when eating opens, and typical context", () => {
    const s = deriveEatingWindow({ ...base, now: at(15, 11, 42), marks: [{ id: "c", dayId: "d", boundary: "CLOSED", at: at(15, 0).toISOString() }] });
    expect(s).toMatchObject({ kind: "FASTING", elapsedMinutes: 702, opensAt: "14:00", markId: "c" });
    expect((s as { context: string }).context).toBe(typicalContext(702));
  });
  it("after he starts eating: open, with time left in his window", () => {
    expect(deriveEatingWindow({ ...base, now: at(15, 18), marks: [
      { id: "c", dayId: "d", boundary: "CLOSED", at: at(15, 0).toISOString() }, { id: "o", dayId: "d", boundary: "OPENED", at: at(15, 14).toISOString() },
    ] })).toEqual({ kind: "OPEN", since: at(15, 14).toISOString(), leftMinutes: 360, closesAt: "00:00", markId: "o" });
  });
  it("a skip for today wins and needs no reason", () => {
    expect(deriveEatingWindow({ ...base, now: at(14, 20), skipId: "s" })).toEqual({ kind: "SKIPPED", skipId: "s" });
  });
});

describe("marks and undo", () => {
  const ev = (id: string, type: DomainEvent["type"], payload: object, dayId = "d", h = 1): DomainEvent =>
    ({ id, type, payload, beyondDayId: dayId, occurredAt: at(15, h).toISOString(), recordedAt: at(15, h).toISOString(), source: "USER", correlationId: id } as DomainEvent);
  it("an undo voids the mark or skip it names; the original stays", () => {
    const events = [ev("c", "EATING_WINDOW_MARKED", { boundary: "CLOSED" }), ev("o", "EATING_WINDOW_MARKED", { boundary: "OPENED" }, "d", 2),
      ev("v", "EATING_WINDOW_MARK_VOIDED", { voidsEventId: "o" }, "d", 3), ev("s", "EATING_WINDOW_DAY_SKIPPED", {}), ev("v2", "EATING_WINDOW_MARK_VOIDED", { voidsEventId: "s" })];
    const r = readMarks(events, "d");
    expect(r.marks.map((m) => m.id)).toEqual(["c"]);
    expect(r.skipId).toBeNull();
  });
});

describe("copy rules (design §5.6, §5.8)", () => {
  it("context is labelled typical, never claims ketosis or autophagy, never a level or success", () => {
    const lines = [0, 300, 800, 1200].map(typicalContext);
    expect(TYPICAL_LABEL).toBe("Typical, not measured in you.");
    for (const l of lines) expect(l).not.toMatch(/unlock|level|success|great|you are in ketosis|autophagy (is|has) (started|begun)|!/i);
    expect(lines[3]).toMatch(/can't tell ketosis/);
  });
  it("asks the four safety questions", () => { expect(SAFETY_QUESTIONS).toHaveLength(4); });
});
