import { describe, expect, it } from "vitest";
import { shiftRecoveryBrief } from "../src/application/rotationProjection";
import type { PictureRow } from "../src/application/wholePictureProjection";
import type { ShiftRun } from "../src/application/shiftRun";

const row = (start: string, context: "WORK" | "OFF", extra: Partial<PictureRow> = {}) => ({
  start, context, dayIds: [start], sessions: 0, ambiguousSleep: false, weights: [],
  checkIn: undefined, checkInCount: 0, energy: undefined, stress: undefined, mood: undefined,
  soreness: undefined, alcoholUrge: undefined, resting: undefined, steps: undefined, measuredHours: 0,
  ...extra,
}) as PictureRow;
const next = new Date(2026, 10, 3, 16, 30);
const run = (kind: "WORK" | "OFF", position: number, length: number): ShiftRun => ({ kind, position, length, next });

describe("SHIFT-RECOVERY-001", () => {
  const rows = [
    row("2026-10-01T21:30:00.000Z", "OFF"),
    row("2026-10-02T21:30:00.000Z", "WORK", { sleepWindow: { start: 900, end: 1260 } }),
    row("2026-10-03T21:30:00.000Z", "OFF", { sessions: 1 }),
    row("2026-10-04T21:30:00.000Z", "WORK", { sleepWindow: { start: 900, end: 1260 } }),
    row("2026-10-05T21:30:00.000Z", "OFF", { sessions: 1 }),
    row("2026-10-06T21:30:00.000Z", "WORK", { sleepWindow: { start: 900, end: 1260 } }),
    row("2026-10-07T21:30:00.000Z", "OFF", { sessions: 1 }),
  ];

  it("protects first sleep on the final shift without claiming recovery", () => {
    const brief = shiftRecoveryBrief(rows, run("WORK", 3, 3));
    expect(brief).toMatchObject({ kind: "FINAL_SHIFT", headline: "Protect the first main sleep." });
    expect(brief!.detail).toContain("has not moved");
    expect(brief!.evidence).toContain("3 runs");
  });

  it("uses recorded day-off position and abstains below the evidence floor", () => {
    expect(shiftRecoveryBrief(rows, run("OFF", 1, 3))).toMatchObject({ kind: "FIRST_DAY_OFF", evidence: "You trained on 3 of 3 recorded day-off 1s." });
    expect(shiftRecoveryBrief(rows.slice(0, 3), run("OFF", 1, 3))!.evidence).toBeNull();
  });

  it("is silent without an operator-saved schedule run", () => {
    expect(shiftRecoveryBrief(rows, null)).toBeNull();
  });
});
