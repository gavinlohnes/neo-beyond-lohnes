import { describe, expect, it } from "vitest";
import { easyToForget } from "../src/application/arrival";
import type { Routine } from "../src/domain/routines";

/** GRAYSON C2.1: the one easy-to-forget BEFORE SHIFT step. Shown by its words alone; never a count. */
const routine = (over: Partial<Routine> = {}): Routine => ({
  id: "r", title: "Before shift", moment: "BEFORE_SHIFT", status: "ACTIVE", source: "USER", createdAt: "", updatedAt: "",
  steps: [{ id: "a", text: "Pack lunch" }, { id: "b", text: "Duty belt check" }, { id: "c", text: "Fill bottle" }], ...over,
});
const day = (...steps: string[]) => new Set(steps.map((s) => `r:${s}`));

describe("easyToForget", () => {
  it("names the step he passed over most on days he did the routine", () => {
    expect(easyToForget([routine()], [day("a", "c"), day("a"), day("a", "b", "c"), day("a", "c")])).toEqual({ routineId: "r", stepId: "b", text: "Duty belt check" });
  });
  it("needs at least two pass-overs; once is nothing", () => {
    expect(easyToForget([routine()], [day("a", "c"), day("a", "b", "c")])).toBeNull();
  });
  it("ignores days he didn't do the routine at all, so not using routines never nags", () => {
    expect(easyToForget([routine()], [day(), day(), day(), day()])).toBeNull();
  });
  it("ties go to the routine's own order", () => {
    expect(easyToForget([routine()], [day("a"), day("a")])!.text).toBe("Duty belt check");
  });
  it("only BEFORE SHIFT, only active routines", () => {
    expect(easyToForget([routine({ moment: "DAY_OFF" })], [day("a"), day("a")])).toBeNull();
    expect(easyToForget([routine({ status: "ARCHIVED" })], [day("a"), day("a")])).toBeNull();
  });
});
