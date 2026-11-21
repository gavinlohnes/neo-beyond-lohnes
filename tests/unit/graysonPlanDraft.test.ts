import { describe, expect, it } from "vitest";
import { buildGraysonPlanDraft } from "../../src/domain/workout/graysonPlanDraft";

describe("Grayson training plan draft", () => {
  it("keeps a balanced three-session foundation at every supported duration", () => {
    for (const minutes of [35, 50, 65] as const) {
      const plan = buildGraysonPlanDraft(["Chest", "Triceps", "Traps"], minutes);
      expect(plan.map((session) => session.id)).toEqual(["A", "B", "C"]);
      for (const session of plan) {
        const roles = session.full.map((item) => item.role).join(" ");
        expect(roles).toMatch(/press|chest/i);
        expect(roles).toMatch(/leg|hinge/i);
        expect(roles).toMatch(/pull/i);
        expect(session.short).toHaveLength(3);
        expect(session.minimum).toHaveLength(2);
        expect(session.home.every((item) => item.role.includes("home"))).toBe(true);
      }
    }
  });

  it("changes accessory priority without removing the first three foundations", () => {
    const chest = buildGraysonPlanDraft(["Chest"], 50)[1]!;
    const traps = buildGraysonPlanDraft(["Traps"], 50)[1]!;
    expect(chest.full.slice(0, 3).map((item) => item.name)).toEqual(traps.full.slice(0, 3).map((item) => item.name));
    expect(chest.full[3]!.name).toBe("Incline Dumbbell Press");
    expect(traps.full[3]!.name).toBe("Face Pull");
  });
});
