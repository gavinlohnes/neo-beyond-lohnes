import { describe, expect, it } from "vitest";
import { DEFAULT_PROTEIN_HEADSUP, proteinHeadsUp, type ProteinDay } from "../../src/engine/proteinPattern";

/** GRAYSON-PROTEIN-HEADSUP-001: the pure pattern. */
const NOW = new Date(2026, 10, 26, 12);
// Nov 22 (Sun) … Nov 25 (Wed): lived-day starts, oldest first.
const day = (d: number, g: number): ProteinDay => ({ beyondDayId: `d${d}`, livedDayStart: new Date(2026, 10, d, 16, 30).toISOString(), proteinG: g });
const S = DEFAULT_PROTEIN_HEADSUP;

describe("protein heads-up", () => {
  it("3 of the last 4 counted days under 75% shows, with the days behind it; 2 of 4 doesn't", () => {
    const h = proteinHeadsUp([day(22, 98), day(23, 104), day(24, 170), day(25, 91)], 180, S, NOW)!;
    expect(h.line).toBe("Protein has been under 75% of your target on 3 of the last 4 days.");
    expect(h.days).toBe("Sun 98 g, Mon 104 g, Wed 91 g of 180 g");
    expect(proteinHeadsUp([day(22, 98), day(23, 140), day(24, 170), day(25, 91)], 180, S, NOW)).toBeNull();
  });

  it("only the last `windowDays` counted days matter, and there must be that many", () => {
    expect(proteinHeadsUp([day(18, 50), day(19, 50), day(22, 170), day(23, 170), day(24, 170), day(25, 170)], 180, S, NOW)).toBeNull();
    expect(proteinHeadsUp([day(23, 50), day(24, 50), day(25, 50)], 180, S, NOW)).toBeNull(); // only 3 counted days
  });

  it("his own numbers apply", () => {
    const days = [day(22, 150), day(23, 150), day(24, 170), day(25, 170)]; // 150 is 83% of 180
    expect(proteinHeadsUp(days, 180, S, NOW)).toBeNull();
    expect(proteinHeadsUp(days, 180, { ...S, underPercent: 90, days: 2 }, NOW)?.line).toBe("Protein has been under 90% of your target on 2 of the last 4 days.");
  });

  it("THAT'S FINE keeps it quiet for 7 days; off or no target shows nothing", () => {
    const days = [day(22, 98), day(23, 104), day(24, 170), day(25, 91)];
    expect(proteinHeadsUp(days, 180, { ...S, dismissedAt: new Date(2026, 10, 20, 12, 1).toISOString() }, NOW)).toBeNull();
    expect(proteinHeadsUp(days, 180, { ...S, dismissedAt: new Date(2026, 10, 19, 12).toISOString() }, NOW)).not.toBeNull();
    expect(proteinHeadsUp(days, 180, { ...S, on: false }, NOW)).toBeNull();
    expect(proteinHeadsUp(days, undefined, S, NOW)).toBeNull();
  });

  it("goes away by itself once the pattern ends", () => {
    const days = [day(22, 98), day(23, 104), day(24, 170), day(25, 91)];
    expect(proteinHeadsUp(days, 180, S, NOW)).not.toBeNull();
    expect(proteinHeadsUp([...days, day(26, 180)], 180, S, new Date(2026, 10, 27, 18))).toBeNull(); // last 4: 104, 170, 91, 180
  });
});
