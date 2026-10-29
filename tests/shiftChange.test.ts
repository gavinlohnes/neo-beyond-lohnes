import { describe, expect, it } from "vitest";
import { buildShiftChange } from "../src/application/shiftChange";
import type { CaveBrief } from "../src/application/caveBrief";
import type { CaveRoute } from "../src/application/caveRoute";

const at = (h: number, m = 0, day = 28) => new Date(2026, 9, day, h, m);
const shift = { start: at(18, 0, 27).toISOString(), end: at(6).toISOString() };
const brief = (over: Partial<CaveBrief>): CaveBrief => ({
  dayId: "d27", phase: "ON", shift, items: [], open: [], handoff: null, memory: [], lastDebrief: null, prep: null, aar: null, ...over,
}) as CaveBrief;
const route = {
  dayStart: at(16, 30, 27).toISOString(), dayEnd: at(16, 30).toISOString(), dayKind: "WORK", notes: [], prepPending: [],
  waypoints: [
    { kind: "SLEEP", at: at(7, 40).toISOString(), fixed: false, label: "SLEEP", why: "", passed: false },
    { kind: "WAKE", at: at(13, 10).toISOString(), fixed: false, label: "WAKE", why: "", passed: false },
  ],
} as unknown as CaveRoute;

describe("SHIFT-CHANGE-001", () => {
  it("lands in the last 45 minutes with what's still open and the landing plan", () => {
    const m = buildShiftChange(brief({ items: [
      { key: "FUEL", system: "FUEL", state: "LATE", detail: "No meal logged before the shift.", source: "" },
      { key: "SLEEP", system: "SLEEP", state: "ADVISORY", detail: "4:45, under your usual.", source: "" },
      { key: "CHECK_IN", system: "CHECK-IN", state: "LATE", detail: "Not checked in.", source: "" },
      { key: "PACK_FOOD", system: "PACK · FOOD", state: "LATE", detail: "Not confirmed.", source: "" },
    ] }), route, at(5, 30))!;
    expect(m).toMatchObject({ key: "d27:LANDING", phase: "LANDING", clock: "T–00:30", signal: "Sleep before this shift: 4:45, under your usual." });
    expect(m.rows.map((r) => r.label)).toEqual(["FUEL"]);
    expect(m.plan).toBe("Usual sleep 07:40–13:10 · lights out in 2:10.");
  });

  it("secures the shift for 3 hours after with the after-action, then goes quiet", () => {
    const aar = [
      { key: "SHIFT", label: "SHIFT", planned: "", actual: "", verdict: "NONE" as const },
      { key: "WATER", label: "WATER", planned: "", actual: "40 oz", verdict: "OFF_PLAN" as const },
      { key: "PROTEIN", label: "PROTEIN", planned: "", actual: "120 g", verdict: "ON_PLAN" as const },
    ];
    const m = buildShiftChange(brief({ phase: "AFTER", aar }), route, at(6, 30), {
      water: [at(17, 0, 27).toISOString(), at(21, 0, 27).toISOString(), at(2).toISOString()], food: [at(23, 30, 27).toISOString(), at(7).toISOString()] })!;
    // The shift on one line: only logs inside the shift, in order.
    expect(m.line).toEqual({ start: shift.start, end: at(6).toISOString(), water: [at(21, 0, 27).toISOString(), at(2).toISOString()], food: [at(23, 30, 27).toISOString()] });
    expect(m).toMatchObject({ key: "d27:SECURED", phase: "SECURED", clock: "12:00", signal: null });
    expect(m.rows).toEqual([{ key: "WATER", label: "WATER", value: "40 oz", tone: "OFF" }, { key: "PROTEIN", label: "PROTEIN", value: "120 g", tone: "ON" }]);
    expect(buildShiftChange(brief({ phase: "AFTER", aar }), route, at(9, 1))).toBeNull();
    // Work marked ended early: the real end, on the clock and in the window.
    expect(buildShiftChange(brief({ phase: "AFTER", aar, endedAt: at(5, 40).toISOString() }), route, at(6, 30))).toMatchObject({ clock: "11:40", end: at(5, 40).toISOString() });
    // Marked ended hours late (a forgotten tap): the schedule's end, never a 19-hour shift.
    expect(buildShiftChange(brief({ phase: "AFTER", aar, endedAt: at(13, 30).toISOString() }), route, at(7))).toMatchObject({ clock: "12:00", end: at(6).toISOString() });
    expect(buildShiftChange(brief({ phase: "AFTER", aar, endedAt: at(13, 30).toISOString() }), route, at(13, 30))).toBeNull();
  });

  it("gives the 90 minutes before a shift to PREFLIGHT: one line of what is still to do, until started", () => {
    const items = [
      { key: "SLEEP" as const, system: "SLEEP", state: "ADVISORY" as const, detail: "4:45, under your usual.", source: "" },
      { key: "CHECK_IN" as const, system: "CHECK-IN", state: "GO" as const, detail: "Checked in.", source: "" },
      { key: "PACK_FOOD" as const, system: "PACK · FOOD", state: "HOLD" as const, detail: "Not confirmed.", source: "" },
    ];
    const m = buildShiftChange(brief({ phase: "BEFORE", items, open: ["PACK · FOOD"] }), route, at(16, 45, 27))!;
    expect(m).toMatchObject({ key: "d27:PREFLIGHT", phase: "PREFLIGHT", clock: "T–01:15", end: shift.start, line: null, plan: "Still to do: pack food.", signal: "Sleep before this shift: 4:45, under your usual." });
    // OWNER-GO-001: no per-system rows; the cave's BRIEF keeps them.
    expect(m.rows).toEqual([]);
    expect(buildShiftChange(brief({ phase: "BEFORE", items }), route, at(16, 29, 27))).toBeNull();
  });

  it("stays out of the way mid-shift, early before a shift and with no shift", () => {
    expect(buildShiftChange(brief({}), route, at(3))).toBeNull();
    expect(buildShiftChange(brief({ phase: "BEFORE" }), route, at(15, 30, 27))).toBeNull();
    expect(buildShiftChange(brief({ shift: null, phase: "NO_SHIFT" }), route, at(6, 30))).toBeNull();
    expect(buildShiftChange(null, route, at(6, 30))).toBeNull();
  });
});
