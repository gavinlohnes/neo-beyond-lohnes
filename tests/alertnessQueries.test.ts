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
