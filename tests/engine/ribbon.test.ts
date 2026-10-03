import { describe, expect, it } from "vitest";
import { projectRibbon, RIBBON_DAYS } from "../../src/engine/ribbon";
import type { DaySummary } from "../../src/engine/dayLedger";

/** The Ribbon (2026-10-03): 28 lived-day columns from the Day Ledger. */
const boundary = (m: number, d: number) => new Date(2026, m - 1, d, 16, 30, 0, 0).toISOString();

function summary(id: string, livedDayStart: string, partial: Partial<DaySummary> = {}): DaySummary {
  return {
    beyondDayId: id,
    startedAt: livedDayStart,
    livedDayStart,
    work: { declared: "OFF", scheduled: "OFF" },
    sleep: {},
    workouts: [],
    urges: [],
    cleanDay: false,
    burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
    ...partial,
  };
}

describe("projectRibbon", () => {
  it("is 28 lived-day columns, oldest first, ending with the lived day now is in", () => {
    const days = projectRibbon([], new Date(2026, 9, 13, 9, 0)); // Tue 09:00 → the lived day began Mon 16:30
    expect(days).toHaveLength(RIBBON_DAYS);
    expect(days.at(-1)!.livedDayStart).toBe(boundary(10, 12));
    expect(days[0]!.livedDayStart).toBe(boundary(9, 15));
    expect(days.every((d) => !d.hasRecord)).toBe(true);
  });

  it("keeps a missing day empty and a recorded day's facts, never filling gaps", () => {
    const days = projectRibbon(
      [
        summary("w", boundary(10, 12), {
          work: { declared: "WORK", scheduled: "WORK" },
          sleep: { primaryMinutes: 420, napMinutes: 30 },
          proteinG: 182,
          urges: [{ at: boundary(10, 12), trigger: "STRESS", phase: "SCHEDULED_SHIFT" }],
        }),
      ],
      new Date(2026, 9, 13, 9, 0),
    );
    expect(days.at(-1)).toEqual({ livedDayStart: boundary(10, 12), hasRecord: true, worked: true, mainSleepMinutes: 420, proteinG: 182, urges: 1, cleanDay: false });
    // Naps aren't main sleep; the day before has no record at all.
    expect(days.at(-2)).toEqual({ livedDayStart: boundary(10, 11), hasRecord: false, worked: false, urges: 0, cleanDay: false });
  });

  it("combines two BeyondDays in one lived day, and shows the best-finished workout with every PR", () => {
    const workout = (id: string, status: string, prCount?: number) => ({
      sessionId: id,
      templateId: id.toUpperCase(),
      sessionType: "STANDARD",
      status,
      startedAt: boundary(10, 12),
      setsLogged: 3,
      ...(prCount !== undefined ? { prCount } : {}),
    });
    const days = projectRibbon(
      [
        summary("a", boundary(10, 12), { sleep: { primaryMinutes: 200 }, proteinG: 40, workouts: [workout("b", "PARTIAL", 1), workout("x", "ABANDONED")] }),
        summary("b", boundary(10, 12), { sleep: { primaryMinutes: 100 }, cleanDay: true, workouts: [workout("c", "COMPLETED", 2)] }),
      ],
      new Date(2026, 9, 13, 9, 0),
    );
    expect(days.at(-1)).toMatchObject({
      mainSleepMinutes: 300,
      proteinG: 40,
      cleanDay: true,
      lift: { status: "COMPLETED", templateId: "C", prCount: 3 },
    });
  });

  it("keeps every column at 16:30 local across the end of daylight saving", () => {
    const days = projectRibbon([], new Date(2026, 10, 10, 9, 0)); // spans Nov 1 2026
    for (const d of days) {
      const local = new Date(d.livedDayStart);
      expect([local.getHours(), local.getMinutes()]).toEqual([16, 30]);
    }
  });
});
