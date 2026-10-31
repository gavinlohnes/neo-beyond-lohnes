import { describe, expect, it } from "vitest";
import { buildBridgePlan, helperSyncUrl } from "../../src/application/bridgePlan";

/** BRIDGE-MOMENTS-001: the plan SYNC GARMIN hands the Bridge — three moments per shift, future only. */
describe("BRIDGE-MOMENTS-001", () => {
  it("builds the week's moments from the schedule and carries them in the link", async () => {
    const now = new Date(2026, 9, 31, 6, 0);
    const plan = await buildBridgePlan("https://example.test/beyond/", "Sleep first.", now);
    expect(plan.home).toBe("https://example.test/beyond/");
    expect(plan.moments.length).toBeGreaterThan(0);
    expect(plan.moments.length % 3).toBe(0);
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
});
