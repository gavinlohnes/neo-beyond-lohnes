import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CLOSE_GAPS, deriveCloseGaps, getCloseGaps } from "../src/application/dayClose";
import { DEFAULT_LOG_NUDGE } from "../src/application/logNudge";
import { logBodyweight, setWorkContext, startDay } from "../src/application/commands";
import { logManualMeal, voidMealLog } from "../src/application/nutritionCommands";

/**
 * GRAYSON-CLOSE-GAPS-001: the close names what didn't get logged, at most two gaps, meals then weight. Run in
 * TZ=UTC and TZ=America/Chicago; times are wall clock in the run's zone. Invented data.
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const shift = { start: at(23, 18), end: at(24, 6) };
const base = (over: Partial<Parameters<typeof deriveCloseGaps>[0]> = {}) => deriveCloseGaps({
  settings: DEFAULT_CLOSE_GAPS, now: at(24, 6, 45), hasUsualTimes: true, meals: [], shift, lastWeighIn: at(23, 8).toISOString(), ...over,
});

describe("deriveCloseGaps", () => {
  it("names the meals gap only when he has usual meal times", () => {
    expect(base()?.gaps).toEqual([{ kind: "MEALS", text: "No meals logged today outside your shift." }]);
    expect(base({ hasUsualTimes: false })).toBeNull();
  });
  it("a meal inside the shift does not clear the outside-shift gap; one outside does", () => {
    expect(base({ meals: [at(23, 23).toISOString()] })?.gaps.map((g) => g.kind)).toEqual(["MEALS"]);
    expect(base({ meals: [at(23, 23).toISOString(), at(23, 17).toISOString()] })).toBeNull();
  });
  it("weigh-in gap at 3 days by default, and at his edited value", () => {
    expect(base({ hasUsualTimes: false, lastWeighIn: at(22, 8).toISOString() })).toBeNull();
    expect(base({ hasUsualTimes: false, lastWeighIn: at(21, 8).toISOString() })?.gaps).toEqual([{ kind: "WEIGHT", text: "No weigh-in since Nov 21." }]);
    const settings = { enabled: true, weighGapDays: 5 };
    expect(base({ settings, hasUsualTimes: false, lastWeighIn: at(21, 8).toISOString() })).toBeNull();
    expect(base({ settings, hasUsualTimes: false, lastWeighIn: at(19, 8).toISOString() })?.gaps[0]?.text).toBe("No weigh-in since Nov 19.");
  });
  it("says \"No weigh-in yet.\" with none ever; both gaps at most, meals first, and the tap asks about the meal", () => {
    const both = base({ lastWeighIn: null });
    expect(both?.gaps.map((g) => g.text)).toEqual(["No meals logged today outside your shift.", "No weigh-in yet."]);
    expect(both?.ask).toBe("I ate ");
    expect(base({ hasUsualTimes: false, lastWeighIn: null })?.ask).toBe("My weight this morning was ");
  });
  it("off means no line", () => {
    expect(base({ settings: { ...DEFAULT_CLOSE_GAPS, enabled: false }, lastWeighIn: null })).toBeNull();
  });
  it("a weigh-in at 23:30 local reads as that date", () => {
    expect(base({ hasUsualTimes: false, now: at(24, 6, 45), lastWeighIn: at(21, 23, 30).toISOString() })?.gaps[0]?.text).toBe("No weigh-in since Nov 21.");
    expect(base({ hasUsualTimes: false, now: at(24, 6, 45), lastWeighIn: at(21, 23, 30).toISOString(), settings: { enabled: true, weighGapDays: 4 } })).toBeNull();
  });
});

describe("getCloseGaps (reads his logs)", () => {
  afterEach(() => { vi.useRealTimers(); });
  it("a voided meal does not count; his own meal times count as usual times", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at(23, 16, 31));
    const day = await startDay(at(23, 16, 30).toISOString());
    await setWorkContext(day.id, "OFF", "MANUAL");
    vi.setSystemTime(at(24, 9));
    await logBodyweight(day.id, 182);
    const meal = await logManualMeal(day.id, { name: "Eggs", calories: 300, proteinG: 20, carbsG: 2, fatG: 20 });
    vi.setSystemTime(at(24, 12));
    // No learned times (no history) and none of his own: no meals gap at all.
    expect(await getCloseGaps(day.id, DEFAULT_CLOSE_GAPS, DEFAULT_LOG_NUDGE, at(24, 12))).toBeNull();
    const mine = { ...DEFAULT_LOG_NUDGE, edited: { OFF: [20 * 60] } };
    expect(await getCloseGaps(day.id, DEFAULT_CLOSE_GAPS, mine, at(24, 12))).toBeNull();
    await voidMealLog(day.id, meal.eventId);
    expect((await getCloseGaps(day.id, DEFAULT_CLOSE_GAPS, mine, at(24, 12)))?.gaps).toEqual([{ kind: "MEALS", text: "No meals logged today." }]);
  });
});
