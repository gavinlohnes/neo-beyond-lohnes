import { describe, expect, it } from "vitest";
import { buildCaveTonight, buildSinceLastShift, describeComms, describeTonightReading, type TonightInputs } from "../src/application/caveTonight";
import type { PictureRow } from "../src/application/wholePictureProjection";
import type { Recommendation, StateCheckIn } from "../src/domain/common/types";
import type { Obligation } from "../src/domain/intent/types";

const start = (day: number) => new Date(2026, 8, day, 16, 30).toISOString();
// 12 finished work days: sleep 6:00–7:00, energy 3–4, protein 150–170 g, water 100–110 oz.
const rows = Array.from({ length: 12 }, (_, i) => ({
  start: start(i + 1), dayIds: [`d${i}`], context: "WORK", sessions: 0, weights: [],
  sleepHours: 6 + (i % 3) * 0.5, energy: 3 + (i % 2), protein: 150 + (i % 3) * 10, water: 100 + (i % 3) * 5,
})) as unknown as PictureRow[];
const day = { id: "today", workContext: "WORK" } as TonightInputs["readout"]["day"];
const checkIn = (energy: number) => ({ id: "c", beyondDayId: "today", recordedAt: start(13), energy, stress: 3, mood: 3, soreness: 2, alcoholUrge: 0 }) as unknown as StateCheckIn;
const input = (over: Partial<TonightInputs> = {}): TonightInputs => ({
  rows, readout: { day, lastMainSleep: { minutes: 310, recordedAt: start(13), occurredAt: start(13), fromGarmin: false } },
  checkIn: checkIn(2), recommendation: null, decision: undefined, obligations: [], today: "2026-09-13", ...over,
});

describe("SUIT-ALIVE S3 — comms and Tonight", () => {
  it("orders off-normal readings by distance outside your own range, and keeps the rest steady", () => {
    const t = buildCaveTonight(input());
    // Energy 2 sits a full range-width under 3–4; sleep 5:10 sits 0.83 of a width under 6:00–7:00.
    expect(t.off.map((r) => r.id)).toEqual(["energy", "sleep"]);
    expect(t.off.every((r) => r.verdict === "BELOW")).toBe(true);
    expect(t.steady.map((r) => r.id)).toEqual(["protein", "water"]);
    expect(t.steady.every((r) => r.when === "LAST_FULL_DAY")).toBe(true);
  });

  it("speaks tersely and never states the call", () => {
    const t = buildCaveTonight(input());
    expect(describeTonightReading(t.off[1]!)).toBe("Sleep 5:10, 80 min under your usual.");
    expect(describeTonightReading(t.off[0]!)).toBe("Energy 2, under your usual 3–4.");
    expect(describeComms(t)).toBe("Energy 2, under your usual 3–4. Sleep 5:10, 80 min under your usual.");
    expect(describeComms(buildCaveTonight(input({ checkIn: checkIn(3), readout: { day, lastMainSleep: { minutes: 390, recordedAt: start(13), occurredAt: start(13), fromGarmin: true } } }))))
      .toBe("Every reading sits inside your normal.");
  });

  it("does not invent a range below the minimum days", () => {
    const t = buildCaveTonight(input({ rows: rows.slice(0, 6) }));
    expect(t.off).toEqual([]); expect(t.steady).toEqual([]);
    expect(t.learning.map((l) => l.id)).toEqual(["sleep", "energy", "protein", "water"]);
    expect(describeComms(t)).toBe("Still learning your normal: 6 of 10 days so far.");
    expect(describeComms(buildCaveTonight(input({ rows: [], checkIn: null, readout: { day: null, lastMainSleep: null } })))).toBe("Nothing to read yet. Log sleep or check in.");
  });

  it("lists overdue commitments only, oldest first, and passes the call through unchanged", () => {
    const rec = { id: "r", kind: "RECOVER" } as Recommendation;
    const obligations = [
      { id: "a", title: "Blood work", status: "OPEN", dueAt: "2026-09-10" },
      { id: "b", title: "Renew licence", status: "OPEN", dueAt: "2026-09-13" },
      { id: "c", title: "Dentist", status: "OPEN", dueAt: "2026-09-02" },
      { id: "d", title: "Waiting on form", status: "WAITING", dueAt: "2026-09-01" },
    ] as Obligation[];
    const t = buildCaveTonight(input({ obligations, recommendation: rec, decision: "DECLINED" }));
    expect(t.late.map((l) => l.title)).toEqual(["Dentist", "Blood work"]);
    expect(t.recommendation).toBe(rec); expect(t.decision).toBe("DECLINED");
  });

  it("judges today's protein and water by pace once it has a range, and ahead of pace is steady", () => {
    const pace = (value: number, low: number, high: number) => ({ metric: "water" as const, value, usual: { kind: "RANGE" as const, dayKind: "WORK" as const, low, high, median: (low + high) / 2, days: 12 }, verdict: undefined });
    const t = buildCaveTonight(input({ pace: { water: pace(8, 30, 40), protein: { ...pace(90, 40, 60), metric: "protein" } } }));
    const water = t.off.find((r) => r.id === "water")!;
    expect(water).toMatchObject({ when: "BY_NOW", verdict: "BELOW" });
    expect(describeTonightReading(water)).toBe("Water 8 oz, under your usual 30–40 oz by now.");
    expect(t.steady.find((r) => r.id === "protein")).toMatchObject({ when: "BY_NOW", verdict: "INSIDE" });
    // Without a pace range, the last full day is judged, as before.
    const learning = { ...pace(8, 0, 0), usual: { kind: "LEARNING" as const, dayKind: "WORK" as const, days: 3, need: 10 } };
    expect(buildCaveTonight(input({ pace: { water: learning } })).steady.find((r) => r.id === "water")?.when).toBe("LAST_FULL_DAY");
  });
});

describe("CAVE-DATA D4 — since last shift", () => {
  // 12 work days, then 3 days off: under-usual sleep on two, a workout on one, weight down.
  const off = (i: number, over: Partial<PictureRow>) => ({ start: start(13 + i), dayIds: [`o${i}`], context: "OFF", sessions: 0, weights: [], ...over }) as unknown as PictureRow;
  const offDays = Array.from({ length: 12 }, (_, i) => ({ ...off(-20 + i, { sleepHours: 7 + (i % 3) * 0.5 }), start: new Date(2026, 7, 10 + i, 16, 30).toISOString(), dayIds: [`h${i}`] })) as PictureRow[];
  const shiftRow = { ...rows[11]!, weight: 180 } as PictureRow;
  const since = [...offDays, ...rows.slice(0, 11), shiftRow,
    off(0, { sleepHours: 5 }), off(1, { sleepHours: 7.5, sessions: 1 }), off(2, { sleepHours: 6, weight: 179.4 })];
  const now = new Date(2026, 8, 16, 18, 0);

  it("states plain facts against your own usual, each naming the day it opens", () => {
    const facts = buildSinceLastShift(since, now)!;
    expect(facts.map((f) => f.text)).toEqual([
      "Last shift 4 days ago; 3 full days off since.",
      "2 of 3 nights since ran under your usual sleep.",
      "Last workout 2 days ago.",
      "Weight down 0.6 lb since last shift.",
    ]);
    expect(facts.map((f) => f.dayId)).toEqual(["d11", "o2", "o1", "o2"]);
    expect(facts.every((f) => f.why.length > 0)).toBe(true);
  });

  it("says nothing without a finished shift, and judges last shift's sleep when no night off has passed", () => {
    expect(buildSinceLastShift(offDays, now)).toBeNull();
    const facts = buildSinceLastShift(rows, new Date(2026, 8, 13, 18, 0))!;
    expect(facts[0]!.text).toBe("Last shift yesterday; no full day off since.");
    expect(facts[1]!.text).toMatch(/^Last shift's sleep \d:\d\d, (under|inside|above) your usual\.$/);
    expect(facts[2]!.text).toBe("No workout in the last 12 days.");
  });
});
