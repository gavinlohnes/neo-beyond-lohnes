import { describe, expect, it } from "vitest";
import { describePlates, describeWarmUp, platesPerSide, warmUpRamp } from "../../src/application/gymModeQueries";

/** GYM-001: plate math and the warm-up ramp (pure). */

describe("platesPerSide", () => {
  it("loads common weights with the fewest plates, heaviest first", () => {
    expect(platesPerSide(45)).toEqual([]);
    expect(platesPerSide(135)).toEqual([45]);
    expect(platesPerSide(185)).toEqual([45, 25]);
    expect(platesPerSide(165)).toEqual([35, 25]);
    expect(platesPerSide(225)).toEqual([45, 45]);
    expect(platesPerSide(50)).toEqual([2.5]);
    expect(platesPerSide(315)).toEqual([45, 45, 45]);
  });

  it("refuses weights standard plates can't make", () => {
    expect(platesPerSide(40)).toBeNull();
    expect(platesPerSide(47.5)).toBeNull();
    expect(platesPerSide(137)).toBeNull();
  });

  it("describes the load in plain words", () => {
    expect(describePlates(185)).toBe("185 lb = bar + 45 + 25 per side");
    expect(describePlates(45)).toBe("45 lb = the bar");
    expect(describePlates(137)).toBe("137 lb: not loadable with standard plates");
  });
});

describe("warmUpRamp", () => {
  it("ramps bar ×10, ~50% ×5, ~70% ×3, ~85% ×1, rounded to the nearest loadable weight", () => {
    expect(describeWarmUp(warmUpRamp(185))).toBe("Warm-up: 45 ×10 · 95 ×5 · 130 ×3 · 155 ×1");
    expect(describeWarmUp(warmUpRamp(225))).toBe("Warm-up: 45 ×10 · 115 ×5 · 160 ×3 · 190 ×1");
  });

  it("every step is loadable and lighter than the working weight", () => {
    for (const w of [95, 135, 150, 205, 315, 405]) {
      for (const step of warmUpRamp(w)) {
        expect(platesPerSide(step.weightLbs)).not.toBeNull();
        expect(step.weightLbs).toBeLessThan(w);
      }
    }
  });

  it("drops steps that aren't above the bar or repeat a weight", () => {
    expect(describeWarmUp(warmUpRamp(95))).toBe("Warm-up: 45 ×10 · 50 ×5 · 65 ×3 · 80 ×1");
    expect(describeWarmUp(warmUpRamp(55))).toBe("Warm-up: 45 ×10");
    expect(warmUpRamp(45)).toEqual([]);
    expect(warmUpRamp(Number.NaN)).toEqual([]);
  });
});
