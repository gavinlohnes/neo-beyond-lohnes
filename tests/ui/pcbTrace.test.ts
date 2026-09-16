import { describe, expect, it } from "vitest";
import { generateTraceNetwork } from "../../src/ui/effects/pcbTrace";

describe("generateTraceNetwork (DEPTH-001)", () => {
  it("is deterministic — the same arguments always produce the same network", () => {
    const a = generateTraceNetwork(300, 600, 42, 0.5, 0.3);
    const b = generateTraceNetwork(300, 600, 42, 0.5, 0.3);
    expect(a).toEqual(b);
  });

  it("a different seed produces a different network", () => {
    const a = generateTraceNetwork(300, 600, 1, 0.5, 0.3);
    const b = generateTraceNetwork(300, 600, 2, 0.5, 0.3);
    expect(a).not.toEqual(b);
  });

  it("produces a non-trivial number of segments and via-dots", () => {
    const { segments, dots } = generateTraceNetwork(300, 600, 7, 0.5, 0.3);
    expect(segments.length).toBeGreaterThan(50);
    expect(dots.length).toBeGreaterThan(10);
  });

  it("every segment endpoint stays within a reasonable margin of the given bounds", () => {
    const w = 300, h = 600;
    const { segments } = generateTraceNetwork(w, h, 99, 0.5, 0.3);
    const margin = 60; // branches/overshoot from the last step toward the hub can extend slightly past the edge
    for (const [x1, y1, x2, y2] of segments) {
      expect(x1).toBeGreaterThanOrEqual(-margin);
      expect(x1).toBeLessThanOrEqual(w + margin);
      expect(y1).toBeGreaterThanOrEqual(-margin);
      expect(y1).toBeLessThanOrEqual(h + margin);
      expect(x2).toBeGreaterThanOrEqual(-margin);
      expect(x2).toBeLessThanOrEqual(w + margin);
      expect(y2).toBeGreaterThanOrEqual(-margin);
      expect(y2).toBeLessThanOrEqual(h + margin);
    }
  });

  it("every segment is axis-aligned (Manhattan-routed — no diagonal lines)", () => {
    const { segments } = generateTraceNetwork(300, 600, 5, 0.5, 0.3);
    for (const [x1, y1, x2, y2] of segments) {
      const horizontal = y1 === y2;
      const vertical = x1 === x2;
      expect(horizontal || vertical).toBe(true);
    }
  });

  it("the hub position shifts where the network converges", () => {
    const topHub = generateTraceNetwork(300, 600, 3, 0.5, 0.1);
    const bottomHub = generateTraceNetwork(300, 600, 3, 0.5, 0.9);
    expect(topHub).not.toEqual(bottomHub);
  });
});
