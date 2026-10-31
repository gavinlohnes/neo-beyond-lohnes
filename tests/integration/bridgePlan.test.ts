import { describe, expect, it } from "vitest";
import { buildBridgePlan, helperSyncUrl } from "../../src/application/bridgePlan";
import { createObligation } from "../../src/application/intentCommands";

/** BRIDGE-MOMENTS-001: the plan SYNC GARMIN hands the Bridge — three moments per shift, future only. */
describe("BRIDGE-MOMENTS-001", () => {
  it("builds the week's moments from the schedule and carries them in the link", async () => {
    const now = new Date(2026, 9, 31, 6, 0);
    const plan = await buildBridgePlan("https://example.test/beyond/", "Sleep first.", now);
    expect(plan.home).toBe("https://example.test/beyond/");
    expect(plan.moments.length).toBeGreaterThan(0);
    expect(plan.moments.length % 3).toBe(0); // three per shift; no tasks yet
    expect(plan.moments.every((m) => m.at > now.getTime())).toBe(true);
    const [wake, before, done] = plan.moments;
    expect([wake!.title, before!.title, done!.title]).toEqual(["Up for the shift?", "Shift in 30 minutes", "Shift's done"]);
    expect(before!.at - wake!.at).toBe(150 * 60_000);
    expect(done!.go).toBe("?alfred=debrief");
    const url = helperSyncUrl(plan);
    expect(url.startsWith("intent://sync?plan=")).toBe(true);
    expect(url.endsWith("#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end")).toBe(true);
    expect(JSON.parse(decodeURIComponent(url.slice("intent://sync?plan=".length, url.indexOf("#"))))).toEqual(plan);
  });

  it("BRIDGE-MOMENTS-002: an open task due this week reaches the phone at 16:00 on its day", async () => {
    const now = new Date(2026, 9, 31, 6, 0);
    await createObligation({ title: "Call the bank", dueAt: "2026-11-02" });
    await createObligation({ title: "Far off", dueAt: "2026-12-25" });
    const due = (await buildBridgePlan("https://example.test/beyond/", "", now)).moments.filter((m) => m.title === "Due today");
    expect(due).toEqual([{ at: new Date(2026, 10, 2, 16, 0).getTime(), title: "Due today", text: "Call the bank", go: "" }]);
  });
});
