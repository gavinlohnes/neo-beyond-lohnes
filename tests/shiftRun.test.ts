import { expect, it } from "vitest";
import { describeShiftRun, shiftRun } from "../src/application/shiftRun";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";

/** SHIFT-RUN-001: where today sits in the saved 2-2-3 rotation. Invented schedule. */
const saved = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-10-01T00:00:00.000Z" };
// Week A (from Mon Aug 17 2026) works Mon/Tue/Fri/Sat/Sun; Week B works Wed/Thu. Mon Nov 2 2026 starts a Week B.

it("says nothing without a saved schedule", () => {
  expect(shiftRun(new Date(2026, 10, 2, 20), DEFAULT_SCHEDULE_PATTERN)).toBeNull();
});

it("counts the run of nights and the next day off, by lived day", () => {
  let d = new Date(2026, 10, 2, 20);
  for (let i = 0; i < 14 && shiftRun(d, saved)!.kind !== "WORK"; i++) d = new Date(d.getTime() + 24 * 3600_000);
  const run = shiftRun(d, saved)!;
  expect(run.kind).toBe("WORK");
  expect(describeShiftRun(run)).toMatch(/^night \d of \d · next day off (Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
  // 04:00 still belongs to the lived day that began at 16:30 the evening before.
  const evening = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17);
  const early = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 4);
  expect(shiftRun(early, saved)).toEqual(shiftRun(evening, saved));
  // Week B (Wed/Thu) is a run of 2 nights.
  expect(shiftRun(new Date(2026, 10, 4, 20), saved)).toMatchObject({ kind: "WORK", position: 1, length: 2 });
});

it("counts days off and when he's back on", () => {
  let d = new Date(2026, 10, 2, 20);
  for (let i = 0; i < 14 && shiftRun(d, saved)!.kind !== "OFF"; i++) d = new Date(d.getTime() + 24 * 3600_000);
  const off = shiftRun(d, saved)!;
  expect(off.kind).toBe("OFF");
  expect(describeShiftRun(off)).toMatch(/^day off 1 of \d · back on \w{3}$/);
});

it("steps by calendar day at 16:30, so a clock change never moves the window (review of #383)", () => {
  // Under any TZ: the run around the US fall-back change (Sun Nov 1 2026) matches a day-by-day count.
  const at = (y: number, m: number, d: number) => new Date(y, m, d, 20);
  const seen = Array.from({ length: 10 }, (_, i) => shiftRun(at(2026, 9, 28 + i), saved)?.kind);
  // Week A (Oct 26) works Mon/Tue/Fri/Sat/Sun; Week B (Nov 2) Wed/Thu.
  expect(seen).toEqual(["OFF", "OFF", "WORK", "WORK", "WORK", "OFF", "OFF", "WORK", "WORK", "OFF"]);
  expect(shiftRun(at(2026, 9, 30), saved)).toMatchObject({ kind: "WORK", position: 1, length: 3 });
  expect(shiftRun(at(2026, 9, 30), saved)!.next.getHours()).toBe(16);
});
