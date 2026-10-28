import { describe, expect, it } from "vitest";
import { lines } from "../../src/ui/screens/systems/CaveLog";
import { buildCaveRoute } from "../../src/application/caveRoute";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { DomainEvent, Recommendation } from "../../src/domain/common/types";

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();
const everyDay = { ...DEFAULT_SCHEDULE_PATTERN, weeks: [{ workdays: [0, 1, 2, 3, 4, 5, 6] }] };

describe("SUIT-ALIVE S8 — the cave, Log", () => {
  it("rebuilds what the cave said from records and the route, newest first, beside the recorder", () => {
    const now = new Date(2026, 9, 17, 6, 20);
    const route = buildCaveRoute({ day: { startedAt: at(16, 16, 30), workContext: "WORK" }, pattern: everyDay, rows: [], workEndedAt: null, prep: null, now });
    const rec = { id: "r", kind: "RECOVER", title: "Protect recovery", rationale: "Capacity is constrained.", issuedAt: at(16, 17, 0) } as Recommendation;
    const water = { id: "e", type: "WATER_LOGGED", source: "USER", recordedAt: at(16, 20, 0), payload: { amountOz: 16 } } as unknown as DomainEvent;
    const { comms, recorder } = lines({ events: [water], recommendations: [rec], route }, now);
    expect(comms.map((l) => [l.at, l.text])).toEqual([
      [at(17, 6, 0), "Shift's done. Shift down when you're ready."],
      [at(16, 18, 0), "On shift."],
      [at(16, 17, 0), "Protect recovery. Capacity is constrained. Keep recovery in view. Your call."],
    ]);
    expect(recorder).toHaveLength(1);
    expect(recorder[0]).toMatchObject({ who: "YOU", at: at(16, 20, 0) });
  });
});
