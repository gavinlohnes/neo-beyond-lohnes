import { describe, expect, it } from "vitest";
import { buildCaveVital, caveUsual, describeCaveVital, type CaveInputs } from "../src/application/caveVitals";
import type { PictureRow } from "../src/application/wholePictureProjection";
import type { StateCheckIn } from "../src/domain/common/types";

const start = (day: number) => new Date(2026, 8, day, 16, 30).toISOString();
const row = (day: number, context: PictureRow["context"], v: Partial<PictureRow> = {}) =>
  ({ start: start(day), dayIds: [`d${day}`], context, sessions: 0, ambiguousSleep: false, weights: [], ...v } as unknown as PictureRow);

// 20 finished days: runs of 4 work / 3 off from Sep 1 (Sep 1 run is cut by the window), then today = shift 3.
const ctx = (d: number): PictureRow["context"] => ((d - 1) % 7) < 4 ? "WORK" : "OFF";
const rows = Array.from({ length: 20 }, (_, i) => i + 1).map((d) => row(d, ctx(d), {
  sleepHours: ctx(d) === "WORK" ? 6 + (d % 3) * 0.5 : 8, energy: ctx(d) === "WORK" ? 3 : 4,
  protein: d === 5 ? undefined : 150, water: 100 + d,
}));
// Sep 15–18 work, 19–20 off... adjust the tail so today is shift 3: end on two work days.
rows.push(row(21, "WORK", { sleepHours: 5, energy: 2, protein: 140, water: 90 }), row(22, "WORK", { sleepHours: 5.5, energy: 2, protein: 145, water: 95 }));

const day = { id: "today", workContext: "WORK" } as CaveInputs["readout"]["day"];
const checkIn = { id: "c", beyondDayId: "today", recordedAt: new Date(2026, 8, 23, 17, 20).toISOString(), energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 0 } as unknown as StateCheckIn;
const input = (over: Partial<CaveInputs["readout"]> = {}): CaveInputs => ({ rows, checkIn, readout: {
  day, lastMainSleep: { minutes: 310, recordedAt: start(23), occurredAt: new Date(2026, 8, 23, 13, 51).toISOString(), fromGarmin: true },
  proteinG: 38, proteinTargetG: 180, waterOz: 16, checkIn: { capacity: "YELLOW", reasonCodes: [], recordedAt: checkIn.recordedAt }, ...over } });

describe("SUIT-ALIVE S2 — the cave, Vitals", () => {
  it("uses the personal-baselines rule: middle half of the same kind of day, and learns below 10 days", () => {
    const usual = caveUsual(rows, "sleep", "WORK");
    expect(usual).toMatchObject({ kind: "RANGE", dayKind: "WORK" });
    if (usual.kind !== "RANGE") return;
    expect(usual.days).toBe(rows.filter((r) => r.context === "WORK").length);
    expect(usual.low).toBeLessThanOrEqual(usual.median); expect(usual.median).toBeLessThanOrEqual(usual.high);
    expect(caveUsual(rows.slice(0, 8), "sleep", "WORK")).toEqual({ kind: "LEARNING", dayKind: "WORK", days: 5, need: 10 });
    // A missing protein day is not a zero.
    expect(caveUsual(rows, "protein", "ALL")).toMatchObject({ kind: "RANGE", days: rows.length - 1 });
  });

  it("judges complete readings, never a running total", () => {
    const sleep = buildCaveVital("sleep", input());
    expect(sleep.today).toEqual({ value: 310 / 60, partial: false });
    expect(sleep.verdict).toBe("BELOW");
    expect(describeCaveVital(sleep)).toMatch(/^\d+ minutes under your usual \d:\d\d\. Usual range \d:\d\d–\d:\d\d\.$/);
    const water = buildCaveVital("water", input());
    expect(water).toMatchObject({ today: { value: 16, partial: true }, verdict: undefined, unit: "oz" });
    expect(describeCaveVital(water)).toMatch(/^Running total\. A usual full day is \d+ oz–\d+ oz\.$/);
    expect(water.facts).toContain("So far today: 16 oz.");
    expect(buildCaveVital("energy", input()).verdict).toBe("BELOW");
  });

  it("shows where you usually are at today's place in the run, and the kinds of day", () => {
    const sleep = buildCaveVital("sleep", input());
    expect(sleep.position[0]!.label).toBe("Shift 3, across runs");
    expect(sleep.position.map((p) => p.label).slice(1)).toEqual(["Work days", "Days off"]);
    expect(buildCaveVital("protein", input()).position.map((p) => p.label)).toEqual(["Work days", "Days off"]);
  });

  it("says what each reading feeds and where it came from", () => {
    expect(buildCaveVital("energy", input()).feeds.decides).toBe(true);
    expect(buildCaveVital("sleep", input()).feeds.decides).toBe(true);
    expect(buildCaveVital("water", input()).feeds).toEqual({ decides: false, text: "Informational. It does not change BEYOND's advice." });
    expect(buildCaveVital("sleep", input()).source[0]).toEqual({ label: "Source", value: "Garmin · main sleep" });
    expect(buildCaveVital("energy", input()).facts[0]).toBe("Check-in 17:20: energy 2, stress 3, mood 3, soreness 2.");
  });

  it("is honest with nothing recorded", () => {
    const empty = buildCaveVital("energy", { rows: [], checkIn: undefined, readout: { day: null, lastMainSleep: null, proteinG: null, proteinTargetG: undefined, waterOz: null, checkIn: null } });
    expect(empty.usual).toEqual({ kind: "LEARNING", dayKind: "ALL", days: 0, need: 10 });
    expect(describeCaveVital(empty)).toBe("No check-in today yet.");
    expect(empty.trend).toEqual([]);
  });
});
