import { describe, expect, it } from "vitest";
import { describePace, minuteOfDay, paceReading, paceUsual, type PaceHistory } from "../src/application/pace";

// 12 past work days: 20 oz an hour in (17:30), and 16–24 oz more around 01:30 (minute 540).
const history: PaceHistory = { dayKind: "WORK", days: Array.from({ length: 12 }, (_, i) => [
  { minute: 60, amount: 20 }, { minute: 540, amount: 16 + (i % 5) * 2 },
]) };

describe("SUIT-ALIVE S5 — pace", () => {
  it("is your usual total by this minute of the lived day, by the personal-baselines rule", () => {
    expect(paceUsual(history, 30)).toEqual({ kind: "RANGE", dayKind: "WORK", low: 0, high: 0, median: 0, days: 12 });
    expect(paceUsual(history, 120)).toMatchObject({ kind: "RANGE", low: 20, high: 20 });
    const late = paceUsual(history, 600);
    expect(late).toMatchObject({ kind: "RANGE", days: 12 });
    if (late.kind === "RANGE") { expect(late.low).toBeGreaterThanOrEqual(36); expect(late.high).toBeLessThanOrEqual(44); }
  });

  it("judges a running total against that, never against a full day", () => {
    expect(paceReading("water", 8, history, 120).verdict).toBe("BELOW");
    expect(paceReading("water", 20, history, 120).verdict).toBe("INSIDE");
    expect(paceReading("water", 60, history, 120).verdict).toBe("ABOVE");
    expect(describePace(paceReading("water", 8, history, 120))).toBe("Behind your usual pace: usually 20 oz by now.");
    expect(describePace(paceReading("protein", 90, { dayKind: "OFF", days: history.days }, 600))).toMatch(/^Ahead of your usual pace: usually \d+–\d+ g by now\.$/);
  });

  it("learns below the minimum days, and counts a day with no logs as missing, not zero", () => {
    const thin = { dayKind: "WORK" as const, days: history.days.slice(0, 7) };
    expect(paceReading("water", 0, thin, 120)).toMatchObject({ verdict: undefined, usual: { kind: "LEARNING", days: 7, need: 10 } });
    expect(describePace(paceReading("water", 0, thin, 120))).toBe("Still learning your pace: 7 of 10 days so far.");
  });

  it("counts minutes from the lived day's start", () => {
    expect(minuteOfDay(new Date(2026, 9, 16, 16, 30).toISOString(), new Date(2026, 9, 16, 18, 0))).toBe(90);
  });
});
