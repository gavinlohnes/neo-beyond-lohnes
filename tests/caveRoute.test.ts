import { describe, expect, it } from "vitest";
import { buildCaveRoute, describeIn, nextWaypoints, routeCallout, type RouteInputs } from "../src/application/caveRoute";
import type { PictureRow } from "../src/application/wholePictureProjection";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";
import type { PreparationState } from "../src/domain/preparation";

const everyDay = { ...DEFAULT_SCHEDULE_PATTERN, weeks: [{ workdays: [0, 1, 2, 3, 4, 5, 6] }] };
const noDays = { ...DEFAULT_SCHEDULE_PATTERN, weeks: [{ workdays: [] as number[] }] };
// Garmin-timed work days: median asleep 08:08, awake 14:48 (minutes after 16:30).
const rows = [930, 940, 950, 935].map((start, i) => ({ start: "", context: "WORK", sleepWindow: { start, end: start + 400 }, dayIds: [`d${i}`] })) as unknown as PictureRow[];
const prep = (food: string, bottle: string) => ({ FOOD: { id: null, value: food, recordedAt: null }, BOTTLE: { id: null, value: bottle, recordedAt: null } }) as unknown as PreparationState;
const input = (over: Partial<RouteInputs> = {}): RouteInputs => ({
  day: { startedAt: new Date(2026, 9, 16, 16, 30).toISOString(), workContext: "WORK" }, pattern: everyDay, rows,
  workEndedAt: null, prep: prep("READY", "UNCONFIRMED"), now: new Date(2026, 9, 16, 17, 20), ...over,
});
const hm = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

describe("SUIT-ALIVE S4 — the route", () => {
  it("lays out a work day: schedule fixed, your usual sleep and wake hollow, then the rollover", () => {
    const route = buildCaveRoute(input());
    expect(route.waypoints.map((w) => [w.kind, hm(w.at), w.fixed])).toEqual([
      ["SHIFT_START", "18:00", true], ["SHIFT_END", "06:00", true], ["SLEEP", "08:08", false], ["WAKE", "14:48", false], ["DAY_END", "16:30", true],
    ]);
    expect(route.waypoints[0]!.why).toBe("From your schedule. Food ready, bottle not confirmed.");
    expect(route.waypoints[2]!.why).toBe("Your usual sleep start on work days, from 4 Garmin-timed days. Not an order.");
    expect(route.prepPending).toEqual(["bottle"]);
  });

  it("shows the next three ahead and how long to the first", () => {
    const route = buildCaveRoute(input());
    const now = new Date(2026, 9, 16, 17, 20);
    expect(nextWaypoints(route, now).map((w) => w.kind)).toEqual(["SHIFT_START", "SHIFT_END", "SLEEP"]);
    expect(describeIn(nextWaypoints(route, now)[0]!.at, now)).toBe("in 40 min");
    expect(describeIn(nextWaypoints(route, now)[1]!.at, now)).toBe("in 12:40");
    // Marking work ended early passes the shift's end.
    const ended = buildCaveRoute(input({ workEndedAt: new Date(2026, 9, 17, 5, 0).toISOString(), now: new Date(2026, 9, 17, 5, 10) }));
    expect(nextWaypoints(ended, new Date(2026, 9, 17, 5, 10)).map((w) => w.kind)).toEqual(["SLEEP", "WAKE", "DAY_END"]);
  });

  it("calls out a point passed within half an hour, then goes quiet", () => {
    const route = buildCaveRoute(input());
    expect(routeCallout(route, new Date(2026, 9, 16, 18, 10))).toBe("On shift. Bottle not confirmed.");
    expect(routeCallout(route, new Date(2026, 9, 16, 18, 31))).toBeNull();
    expect(routeCallout(route, new Date(2026, 9, 17, 6, 5))).toBe("Shift's done. Shift down when you're ready.");
    expect(routeCallout(route, new Date(2026, 9, 17, 8, 15))).toBe("Your usual sleep time. Your call.");
    expect(routeCallout(buildCaveRoute(input({ prep: prep("READY", "NOT_NEEDED") })), new Date(2026, 9, 16, 18, 0))).toBe("On shift.");
  });

  it("is honest without a schedule or enough history", () => {
    const thin = buildCaveRoute(input({ pattern: noDays, rows: rows.slice(0, 2) }));
    expect(thin.waypoints.map((w) => w.kind)).toEqual(["DAY_END"]);
    expect(thin.notes).toEqual([
      "A work day with no shift in your schedule, so the route has no shift times.",
      "Usual sleep and wake times appear after 3 Garmin-timed work days; 2 so far.",
    ]);
    const off = buildCaveRoute(input({ day: { startedAt: new Date(2026, 9, 16, 16, 30).toISOString(), workContext: "OFF" } }));
    expect(off.dayKind).toBe("OFF");
    expect(off.waypoints.some((w) => w.kind === "SHIFT_START")).toBe(false);
    expect(off.prepPending).toEqual([]);
  });
});
