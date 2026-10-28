import { describe, expect, it } from "vitest";
import { buildCaveFile, firmness, formatRunSleep } from "../src/application/caveFile";
import { runPositions } from "../src/application/rotationProjection";
import type { PictureRow } from "../src/application/wholePictureProjection";

// 35 days: an unknown day, then 5 cycles of 4 work days (S2 sleeps shortest) and 3 days off (D2 trains).
const rows: PictureRow[] = [{ start: "d0", dayIds: [], context: "UNKNOWN", sessions: 0 } as unknown as PictureRow];
for (let cycle = 0; cycle < 5; cycle++) {
  [6.5, 5.25, 6, 6.25].forEach((sleepHours, i) => rows.push({ start: `w${cycle}${i}`, dayIds: [`w${cycle}${i}`], context: "WORK", sessions: 0, sleepHours, energy: i === 3 ? 2 : 3, protein: 150, water: 100,
    sleepWindow: { start: 930, end: 1300 } } as unknown as PictureRow));
  [8, 8, 7.5].forEach((sleepHours, i) => rows.push({ start: `o${cycle}${i}`, dayIds: [`o${cycle}${i}`], context: "OFF", sessions: i === 1 ? 1 : 0, sleepHours, energy: 4, protein: 140, water: 90,
    sleepWindow: i === 0 ? { start: 420, end: 960 } : undefined } as unknown as PictureRow));
}
const file = (over = {}) => buildCaveFile({ rows, positions: runPositions(rows), lessons: [], journal: [], ...over });

describe("SUIT-ALIVE S7 — the cave, File", () => {
  it("rates calibration THIN, BUILDING, FIRM by days on file against the floor", () => {
    expect([firmness(4, 10), firmness(10, 10), firmness(19, 10), firmness(20, 10)]).toEqual(["THIN", "BUILDING", "BUILDING", "FIRM"]);
    const f = file();
    expect(f.calibration.find((c) => c.key === "sleep-WORK")).toMatchObject({ days: 20, need: 10, firmness: "FIRM" });
    expect(f.calibration.find((c) => c.key === "sleep-OFF")).toMatchObject({ days: 15, firmness: "BUILDING" });
    expect(f.calibration.find((c) => c.key === "timing-OFF")).toMatchObject({ days: 5, need: 3, firmness: "BUILDING" });
    expect(f.notKnown).toHaveLength(3);
  });

  it("files findings only once their floor is met, as patterns not causes", () => {
    const f = file({ lessons: [{ title: "Frozen meals", lesson: "Pack two", reviewedAt: "2026-10-01", updatedAt: "2026-10-01" }] });
    expect(f.findings.map((x) => x.key)).toEqual(["SLEEP_LOW", "ENERGY_LOW", "TRAINS", "FLIP_BACK", "LESSON"]);
    expect(f.findings[0]!.text).toBe("Shift 2 is your shortest main sleep in a work run: 5:15 on average.");
    expect(f.findings[1]!.text).toBe("Shift 4 is where your check-in energy runs lowest: 2.0 on average.");
    expect(f.findings[2]!.text).toBe("Day off 2 is the day off you train most: 5 of 5 times.");
    expect(f.findings[3]!.text).toBe("After a work run, your first night off you usually fall asleep around 23:30 and wake around 08:30.");
    // Too little history: nothing is claimed.
    expect(buildCaveFile({ rows: rows.slice(0, 8), positions: runPositions(rows.slice(0, 8)), lessons: [], journal: [] }).findings).toEqual([]);
  });

  it("lays out the whole run place by place, with counts where a mean isn't earned", () => {
    const f = file();
    const work = f.wholeRun.find((r) => r.context === "WORK")!;
    expect(work.columns.map((c) => c.position)).toEqual([1, 2, 3, 4]);
    expect(formatRunSleep(work.columns[1]!)).toBe("5:15");
    expect(f.runs).toEqual({ work: 5, off: 5 });
    const thin = buildCaveFile({ rows: rows.slice(0, 13), positions: runPositions(rows.slice(0, 13)), lessons: [], journal: [] });
    expect(formatRunSleep(thin.wholeRun[0]!.columns[0]!)).toBe("— (2)");
  });
});
