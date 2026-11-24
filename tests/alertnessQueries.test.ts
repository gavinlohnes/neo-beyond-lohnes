import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEnergyToday } from "../src/application/alertnessQueries";
import { nextRolloverBoundaryAfter } from "../src/engine/dayRollover";
const mocks = vi.hoisted(() => ({ sleep: vi.fn(), plan: vi.fn() }));
vi.mock("../src/application/externalSleepQueries", () => ({ getImportedSleep: mocks.sleep }));
vi.mock("../src/application/shiftSleepPlan", () => ({ getShiftSleepPlan: mocks.plan }));
const at = (d: number, h: number) => new Date(2026, 10, d, h).getTime();
const record = (start: number, end: number) => ({ evidence: { startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString() } });
const history = [14, 15, 16, 17, 18].map(d => record(at(d, 7), at(d, 14)));
beforeEach(() => { mocks.sleep.mockResolvedValue(history); mocks.plan.mockResolvedValue(null); });
describe("energy query clock progression", () => {
  it.each([6, 8, 15])("retains the current lived day's assumed sleep at %s:00 while imports are delayed", async h => {
    const data = await getEnergyToday(new Date(at(19, h)));
    expect(data.curve!.points.filter(p => p.asleep).map(p => p.t)).toEqual(Array.from({ length: 28 }, (_, i) => at(19, 7) + i * 900_000));
  });
  it("retains an underway plan window", async () => {
    mocks.plan.mockResolvedValue({ shift: { start: new Date(at(18, 18)).toISOString(), end: new Date(at(19, 6)).toISOString() }, windows: [{ kind: "SLEEP", start: new Date(at(19, 7)).toISOString(), end: new Date(at(19, 14)).toISOString() }], caffeine: { hours: 6, setBy: "DEFAULT" } });
    expect((await getEnergyToday(new Date(at(19, 8)))).curve!.points.filter(p => p.asleep)).toHaveLength(28);
  });
  it("C4.2a: draws the plan's own cut-off hours before the planned sleep, so TODAY matches ROUTE", async () => {
    mocks.plan.mockResolvedValue({ shift: { start: new Date(at(18, 18)).toISOString(), end: new Date(at(19, 6)).toISOString() }, windows: [{ kind: "SLEEP", start: new Date(at(19, 7)).toISOString(), end: new Date(at(19, 14)).toISOString() }], caffeine: { hours: 8, setBy: "OWNER" } });
    expect((await getEnergyToday(new Date(at(18, 20)))).caffeineCutoff).toBe(at(18, 23));
  });
  it("replaces assumed sleep with the actual shorter record", async () => {
    mocks.sleep.mockResolvedValue([...history, record(at(19, 8), at(19, 12))]);
    const points = (await getEnergyToday(new Date(at(19, 15)))).curve!.points;
    expect(points.filter(p => p.asleep)).toHaveLength(16);
    expect(points.find(p => p.t === at(19, 7))!.asleep).toBe(false);
  });
  it.each([new Date(2026, 2, 8, 12), new Date(2026, 10, 1, 12)])("ends at the calendar rollover across DST: %s", async now => {
    const end = nextRolloverBoundaryAfter(now).getTime();
    mocks.sleep.mockResolvedValue([1, 2, 3, 4].map(d => record(now.getTime() - d * 86400000 - 7 * 3600000, now.getTime() - d * 86400000)));
    const data = await getEnergyToday(now);
    expect(data.curve!.to).toBe(end);
    expect(new Date(data.curve!.to).getHours()).toBe(16);
    expect(new Date(data.curve!.to).getMinutes()).toBe(30);
  });
});

/**
 * GRAYSON C4.1 (Gavin, 2026-11-24: "Lock it in"): on a steady run of nights the curve's lowest waking stretch falls in
 * the waking night, never inside the day sleep (#592 finding C1, withdrawn in the research audit once the production
 * query's planned/usual sleep is supplied). Checked through this query, as TODAY reads it, for a grid of 3-night
 * day-sleep patterns, with and without a shift plan. The body-clock assumption itself is unchanged and unvalidated.
 */
describe("C4.1 steady nights: the low sits in the waking night", () => {
  const cases: [number, number][] = [];
  for (const startHalfHours of [13, 14, 15, 16, 17, 18, 19, 20]) for (const lengthHalfHours of [11, 12, 13, 14, 15, 16]) cases.push([startHalfHours / 2, lengthHalfHours / 2]);
  it.each(cases)("day sleep from %s:00 for %s h, 3 nights", async (startH, lengthH) => {
    const span = (d: number) => { const s = new Date(2026, 10, d, 0).getTime() + startH * 3_600_000; return { s, e: s + lengthH * 3_600_000 }; };
    mocks.sleep.mockResolvedValue([16, 17, 18].map((d) => { const { s, e } = span(d); return record(s, e); }));
    const shift = { start: new Date(at(18, 18)).toISOString(), end: new Date(at(19, 6)).toISOString() };
    const sleep = span(19);
    for (const plan of [null, { shift, windows: [{ kind: "SLEEP", start: new Date(sleep.s).toISOString(), end: new Date(sleep.e).toISOString() }], caffeine: { hours: 6, setBy: "DEFAULT" } }]) {
      mocks.plan.mockResolvedValue(plan);
      const { curve } = await getEnergyToday(new Date(at(18, 20)));
      const low = curve!.low!;
      const label = `${startH}h for ${lengthH}h, plan ${plan ? "yes" : "no"}: low ${new Date(low.start).toTimeString().slice(0, 5)}–${new Date(low.end).toTimeString().slice(0, 5)}`;
      expect(low.start, label).toBeGreaterThanOrEqual(at(19, 0)); // after midnight on the shift night
      expect(low.end, label).toBeLessThanOrEqual(sleep.s); // over before the day sleep starts
      expect(curve!.points.filter((p) => p.t >= low.start && p.t < low.end).every((p) => !p.asleep), label).toBe(true);
    }
  });
});
