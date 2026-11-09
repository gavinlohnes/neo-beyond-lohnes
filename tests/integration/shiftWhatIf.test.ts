import { describe, expect, it } from "vitest";
import { shiftWhatIf } from "../../src/application/shiftWhatIf";
import type { PictureRow } from "../../src/application/wholePictureProjection";

/** BIG-IDEAS-001 item 1. Invented runs only: 4-shift runs then 3 days off, repeated. */
const row = (context: "WORK" | "OFF", energy?: number, sleepHours?: number) => ({ context, energy, sleepHours, start: "x", dayIds: [] }) as unknown as PictureRow;
const cycle = (lastEnergy: number, off1: number, off2: number) => [row("WORK", 4), row("WORK", 3), row("WORK", 3), row("WORK", lastEnergy), row("OFF", 3, off1), row("OFF", 4, off2), row("OFF", 4, 8)];

describe("shift what-if", () => {
  it("looks only at complete runs of exactly that length and says what followed, with counts", () => {
    const rows = [row("OFF", 3, 8), ...cycle(2, 9, 7), ...cycle(2, 10, 8), ...cycle(1, 11, 7), row("WORK", 3), row("WORK", 3), row("OFF", 4, 7)];
    const w = shiftWhatIf(rows, 4);
    expect(w).toMatchObject({ shifts: 4, runs: 3, enough: true });
    expect(w.lastShiftEnergy).toEqual({ mean: 5 / 3, days: 3 });
    expect(w.offDay1Sleep).toEqual({ mean: 10, days: 3 });
    expect(w.offDay2Sleep.days).toBe(3);
  });

  it("says nothing it can't support: too few comparable runs, or a run still going", () => {
    expect(shiftWhatIf([row("OFF"), ...cycle(2, 9, 7)], 4)).toMatchObject({ runs: 1, enough: false, lastShiftEnergy: { mean: undefined, days: 1 } });
    // A WORK run at the very start may be clipped by the history window, so it never counts.
    expect(shiftWhatIf([...cycle(2, 9, 7)], 4).runs).toBe(0);
    expect(shiftWhatIf([row("WORK", 3), row("WORK", 3), row("WORK", 3), row("WORK", 3)], 4).runs).toBe(0);
  });
});
