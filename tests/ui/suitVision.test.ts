import { describe, expect, it } from "vitest";
import { effectiveVision } from "../../src/ui/vision/vision";

/** SUIT-ALIVE S8 (Gavin, 2026-10-28): "Night vision is fine to be automatic." Cloak is never automatic. */
describe("SUIT-ALIVE S8 — vision", () => {
  it("AUTO is night vision from midnight while on shift, normal otherwise", () => {
    expect(effectiveVision("AUTO", "SCHEDULED_SHIFT", new Date(2026, 9, 17, 0, 0))).toBe("NIGHT");
    expect(effectiveVision("AUTO", "SCHEDULED_SHIFT", new Date(2026, 9, 17, 5, 50))).toBe("NIGHT");
    expect(effectiveVision("AUTO", "SCHEDULED_SHIFT", new Date(2026, 9, 16, 23, 59))).toBe("NORMAL");
    expect(effectiveVision("AUTO", "EXPECTED_POST_WORK", new Date(2026, 9, 17, 6, 30))).toBe("NORMAL");
    expect(effectiveVision("AUTO", "OFF", new Date(2026, 9, 17, 1, 0))).toBe("NORMAL");
  });
  it("a chosen vision holds whatever the hour", () => {
    expect(effectiveVision("NORMAL", "SCHEDULED_SHIFT", new Date(2026, 9, 17, 2, 0))).toBe("NORMAL");
    expect(effectiveVision("THERMAL", "OFF", new Date(2026, 9, 17, 14, 0))).toBe("THERMAL");
    expect(effectiveVision("NIGHT", undefined, new Date(2026, 9, 17, 14, 0))).toBe("NIGHT");
  });
});
