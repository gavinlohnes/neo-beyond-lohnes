import { describe, expect, it } from "vitest";
import { buildCaveBrief, describeBrief, type BriefInputs } from "../src/application/caveBrief";
import { buildCaveRoute } from "../src/application/caveRoute";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";
import type { PreparationState } from "../src/domain/preparation";
import type { DecisionJournalEntry } from "../src/domain/journal/types";
import type { StateCheckIn } from "../src/domain/common/types";

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();
const everyDay = { ...DEFAULT_SCHEDULE_PATTERN, weeks: [{ workdays: [0, 1, 2, 3, 4, 5, 6] }] };
const route = (now: Date, workEndedAt: string | null = null) => buildCaveRoute({ day: { startedAt: at(16, 16, 30), workContext: "WORK" }, pattern: everyDay, rows: [], workEndedAt, prep: null, now });
const prep = (food: string, bottle: string) => ({ FOOD: { id: "f", value: food, recordedAt: null }, BOTTLE: { id: null, value: bottle, recordedAt: null } }) as unknown as PreparationState;
const range = (low: number, high: number) => ({ kind: "RANGE" as const, dayKind: "WORK" as const, low, high, median: (low + high) / 2, days: 12 });
const debrief = (createdAt: string, felt: string, next?: string) => ({ id: createdAt, title: "Shift debrief", createdAt, decision: `Shift felt ${felt}`, status: "OPEN", ...(next ? { expectation: `Next shift: ${next}` } : {}) }) as unknown as DecisionJournalEntry;
const input = (now: Date, over: Partial<BriefInputs> = {}): BriefInputs => ({
  dayId: "today", route: route(now), now, checkIn: null, sleep: { hours: 5.2, verdict: "BELOW", at: at(16, 13) },
  meals: [], proteinLogs: [], water: [], proteinTotal: 0, waterTotal: 0, pace: {}, usualByEnd: {},
  prep: prep("READY", "UNCONFIRMED"), handoff: { eventId: "h", note: "Eat at the break", notedAt: at(15, 6, 5) },
  memory: [], debriefs: [debrief(at(15, 6, 10), "rough", "Eat at the break")], workEndedAt: null, ...over,
});

describe("SUIT-ALIVE S6 — preflight", () => {
  it("polls every system from your own records: GO, HOLD, ADVISORY", () => {
    const b = buildCaveBrief(input(new Date(2026, 9, 16, 17, 20), {
      checkIn: { recordedAt: at(16, 17, 0), energy: 3, stress: 2 } as unknown as StateCheckIn,
      meals: [{ at: at(16, 17, 10), proteinG: 40 }], proteinTotal: 40,
    }));
    expect(b.phase).toBe("BEFORE");
    expect(b.items.map((i) => [i.system, i.state])).toEqual([
      ["SLEEP", "ADVISORY"], ["CHECK-IN", "GO"], ["FUEL", "GO"], ["HYDRATION", "HOLD"],
      ["PACK · FOOD", "GO"], ["PACK · BOTTLE", "HOLD"], ["HANDOFF", "HOLD"],
    ]);
    expect(describeBrief(b)).toBe("Hold: hydration, bottle and handoff.");
    expect(b.lastDebrief).toEqual({ felt: "rough", next: "Eat at the break", at: at(15, 6, 10) });
  });

  it("turns HOLD to LATE once the shift starts, and says all systems go only when nothing is open", () => {
    const late = buildCaveBrief(input(new Date(2026, 9, 16, 18, 30)));
    expect(late.phase).toBe("ON");
    expect(late.items.find((i) => i.key === "CHECK_IN")!.state).toBe("LATE");
    expect(describeBrief(late)).toMatch(/^Late: /);
    const go = buildCaveBrief(input(new Date(2026, 9, 16, 17, 20), {
      sleep: { hours: 7, verdict: "INSIDE", at: at(16, 13) }, checkIn: { recordedAt: at(16, 17), energy: 4, stress: 2 } as unknown as StateCheckIn,
      meals: [{ at: at(16, 17), proteinG: 40 }], proteinTotal: 40, water: [{ at: at(16, 17), oz: 20 }], waterTotal: 20,
      prep: prep("READY", "NOT_NEEDED"), handoff: null,
      pace: { water: { metric: "water", value: 20, usual: range(10, 30), verdict: "INSIDE" } },
    }));
    expect(go.open).toEqual([]);
    expect(describeBrief(go)).toBe("All systems go.");
  });
});

describe("SUIT-ALIVE S6 — after-action", () => {
  it("sets planned beside actual once the shift is done", () => {
    const now = new Date(2026, 9, 17, 9, 0);
    const b = buildCaveBrief(input(now, {
      route: route(now, at(17, 5, 40)), workEndedAt: at(17, 5, 40),
      meals: [{ at: at(16, 17, 30), proteinG: 40 }, { at: at(17, 2, 40), proteinG: 35 }],
      proteinLogs: [{ at: at(16, 17, 30), proteinG: 40 }, { at: at(17, 2, 40), proteinG: 35 }, { at: at(17, 7), proteinG: 30 }],
      water: [{ at: at(16, 20), oz: 24 }, { at: at(17, 1), oz: 16 }], waterTotal: 40,
      usualByEnd: { water: range(60, 80), protein: range(60, 90) },
      debriefs: [debrief(at(17, 5, 45), "good")],
    }));
    expect(b.phase).toBe("AFTER");
    expect(b.aar!.map((r) => [r.label, r.planned, r.actual, r.verdict])).toEqual([
      ["SHIFT", "18:00–06:00", "Ended 05:40", "NONE"],
      ["MEAL BEFORE", "By 18:00", "17:30", "ON_PLAN"],
      ["MEALS ON SHIFT", "Your call", "02:40", "NONE"],
      ["WATER", "Usual 60–80 oz by 05:40", "40 oz", "OFF_PLAN"],
      ["PROTEIN", "Usual 60–90 g by 05:40", "75 g", "ON_PLAN"],
      ["SLEEP", "No usual yet", "Not yet", "NONE"],
      ["DEBRIEF", "Close the shift", "Felt good", "ON_PLAN"],
    ]);
    expect(describeBrief(b)).toBe("Shift's done. Here's how it went against the plan.");
  });

  it("says plainly when there's no shift", () => {
    const b = buildCaveBrief(input(new Date(2026, 9, 16, 17, 20), { route: buildCaveRoute({ day: { startedAt: at(16, 16, 30), workContext: "OFF" }, pattern: everyDay, rows: [], workEndedAt: null, prep: null, now: new Date(2026, 9, 16, 17, 20) }) }));
    expect(b.phase).toBe("NO_SHIFT");
    expect(b.items.map((i) => i.key)).toEqual(["SLEEP", "CHECK_IN", "FUEL", "HYDRATION"]);
    expect(describeBrief(b)).toBe("No shift on the schedule today.");
  });
});
