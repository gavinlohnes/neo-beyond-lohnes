import { describe, expect, it } from "vitest";
import { BREATH_CYCLE_MS, breathPhaseAt, ringScale } from "../src/ui/screens/today/breathPacer";

/** GRAYSON-SHIFTDOWN-TAPS-001: 2 s in, 1 s in again, 6 s out, repeated. */
describe("breathPhaseAt", () => {
  it("names the phase at each edge", () => {
    expect([0, 1.9, 2.1, 2.9, 3.1, 8.9, 9.1].map((s) => breathPhaseAt(s * 1000).phase)).toEqual(["IN", "IN", "IN_AGAIN", "IN_AGAIN", "OUT", "OUT", "IN"]);
  });
  it("keeps progress within 0..1 and repeats the cycle", () => {
    for (let ms = -500; ms < 3 * BREATH_CYCLE_MS; ms += 137) {
      const p = breathPhaseAt(ms);
      expect(p.progress).toBeGreaterThanOrEqual(0); expect(p.progress).toBeLessThanOrEqual(1);
      if (ms < 0) expect(p).toEqual(breathPhaseAt(0)); // before the start reads as the start
      else expect(breathPhaseAt(ms + BREATH_CYCLE_MS)).toEqual(p);
    }
    expect(breathPhaseAt(Number.NaN)).toEqual({ phase: "IN", progress: 0 });
  });
  it("grows on the breaths in and shrinks on the long breath out", () => {
    expect(ringScale(breathPhaseAt(0))).toBeLessThan(ringScale(breathPhaseAt(2900)));
    expect(ringScale(breathPhaseAt(8900))).toBeLessThan(ringScale(breathPhaseAt(3100)));
  });
});
