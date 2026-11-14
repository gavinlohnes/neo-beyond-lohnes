import { expect, it } from "vitest";
import { deriveMapMarks, describeMap, placeMarks } from "../src/application/livedDayMap";

/** DAY-MAP-001: the lived day's recorded marks, placed on its 16:30 → 16:30 bar. */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();
const dayStart = new Date(2026, 10, 18, 16, 30);
const input = {
  sleep: { start: at(18, 8), end: at(18, 14, 35) },
  meals: [{ at: at(18, 17, 15), name: "Chicken and rice" }],
  water: [{ at: at(18, 19), oz: 20 }, { at: at(18, 23), oz: 0 + 16 }],
  checkIn: at(18, 17, 5),
  work: { start: at(18, 18, 2), end: null },
  workouts: [],
};

it("orders what was recorded and runs open spans to now", () => {
  const marks = deriveMapMarks(input, new Date(2026, 10, 19, 1));
  expect(marks.map((m) => m.kind)).toEqual(["SLEEP", "CHECK_IN", "MEAL", "WORK", "WATER", "WATER"]);
  expect(marks.find((m) => m.kind === "WORK")).toMatchObject({ until: new Date(2026, 10, 19, 1).toISOString(), label: "At work since 18:02" });
  expect(describeMap(marks)).toBe("Recorded since the day started: Sleep 08:00–14:35 (Garmin, 6h 35m); Checked in at 17:05; Chicken and rice at 17:15; At work since 18:02; Water 20 oz at 19:00; Water 16 oz at 23:00.");
  expect(describeMap([])).toBe("Nothing recorded on this lived day yet.");
});

it("places marks on the lived day and leaves out what falls outside it", () => {
  const placed = placeMarks(deriveMapMarks(input, new Date(2026, 10, 19, 1)), dayStart);
  // The morning sleep ended before this lived day began, so it isn't on this bar.
  expect(placed.some((m) => m.kind === "SLEEP")).toBe(false);
  const work = placed.find((m) => m.kind === "WORK")!;
  expect(work.from).toBeCloseTo((1.5 + 1 / 30) / 24, 4); // 18:02
  expect(work.to).toBeCloseTo(8.5 / 24, 4); // to now, 01:00
  expect(placed.find((m) => m.kind === "MEAL")!.to).toBeNull();
  // A sleep across 16:30 is clipped to the bar's start.
  const clipped = placeMarks(deriveMapMarks({ ...input, sleep: { start: at(18, 14), end: at(18, 17) } }, new Date(2026, 10, 19, 1)), dayStart).find((m) => m.kind === "SLEEP")!;
  expect([clipped.from, clipped.to]).toEqual([0, expect.closeTo(0.5 / 24, 4)]);
});

it("slice 2: the sleep plan's windows are outlined while still ahead, and named as planned", async () => {
  const { plannedMarks } = await import("../src/application/livedDayMap");
  const windows = [{ kind: "NAP" as const, start: at(18, 8), end: at(18, 17) }, { kind: "SLEEP" as const, start: at(19, 7, 30), end: at(19, 14, 15) }];
  const now = new Date(2026, 10, 18, 20);
  const planned = plannedMarks(windows, now);
  expect(planned.map((m) => [m.kind, m.planned])).toEqual([["SLEEP_PLAN", true]]); // the nap is over
  const marks = [...deriveMapMarks({ ...input, sleep: null, water: [] }, now), ...planned];
  expect(describeMap(marks)).toBe("Recorded since the day started: Checked in at 17:05; Chicken and rice at 17:15; At work since 18:02. Planned: Usual sleep 07:30–14:15 (sleep plan, your Garmin rhythm).");
  expect(describeMap(planned)).toBe("Nothing recorded on this lived day yet. Planned: Usual sleep 07:30–14:15 (sleep plan, your Garmin rhythm).");
  const placed = placeMarks(marks, dayStart).find((m) => m.kind === "SLEEP_PLAN")!;
  expect([placed.from, placed.to]).toEqual([expect.closeTo(15 / 24, 4), expect.closeTo(21.75 / 24, 4)]);
});

it("review of #507: a last-of-run window is named from your past runs, as ROUTE's FIRST SLEEP card names it", async () => {
  const { plannedMarks } = await import("../src/application/livedDayMap");
  const [mark] = plannedMarks([{ kind: "SLEEP", start: at(19, 7, 30), end: at(19, 14, 15), basis: "PAST_RUNS" }], new Date(2026, 10, 18, 20));
  expect(mark!.label).toBe("First sleep after the run, usually 07:30–14:15 (sleep plan, your past runs)");
});
