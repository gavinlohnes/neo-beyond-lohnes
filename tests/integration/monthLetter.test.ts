import { describe, expect, it } from "vitest";
import { monthLetterAsk, writeMonthLetter } from "../../src/application/monthLetter";
import type { MonthDay } from "../../src/application/monthQueries";

/** MONTH-LETTER-001: invented days only. */
const day = (n: number, extra: Partial<MonthDay> = {}): MonthDay => ({ date: `2026-10-${String(n).padStart(2, "0")}`, dayId: `d${n}`, workouts: 0, urges: 0, clean: false, ...extra });
const LATER = new Date(2026, 11, 2);

describe("writeMonthLetter", () => {
  it("says what was recorded, on how many days, and 'not recorded' for gaps — never zero", () => {
    const letter = writeMonthLetter(2026, 9, [
      day(1, { work: "WORK", sleepMinutes: 360, proteinG: 150, workouts: 1 }),
      day(2, { work: "WORK", sleepMinutes: 480 }),
      day(3, { work: "OFF" }),
      { date: "2026-10-04", workouts: 0, urges: 0, clean: false },
    ], LATER);
    expect(letter.title).toBe("October 2026");
    expect(letter.lines).toEqual([
      "You recorded 3 days: 2 work days and 1 day off.",
      "Sleep, on 2 logged days: 7h 00m on average; 1 night under 7 hours.",
      "Protein, on 1 logged day: 150 g on average.",
      "Training: 1 workout on 1 day.",
    ]);
    const empty = writeMonthLetter(2026, 9, [day(5)], LATER);
    expect(empty.lines).toContain("Sleep: not recorded.");
    expect(empty.lines).toContain("Protein: not recorded.");
    expect(empty.lines).toContain("Training: no workouts recorded.");
    expect(empty.lines.join(" ")).not.toMatch(/\b0 g|0h 00m/);
  });

  it("handles an empty month and a month in progress, and the Alfred ask carries the facts", () => {
    expect(writeMonthLetter(2026, 9, [{ date: "2026-10-01", workouts: 0, urges: 0, clean: false }], LATER)).toEqual({ title: "October 2026", lines: ["Nothing was recorded this month."], daysLogged: 0 });
    const now = writeMonthLetter(2026, 9, [day(1, { clean: true, urges: 2 })], new Date(2026, 9, 15));
    expect(now.title).toBe("October 2026, so far");
    expect(now.lines).toContain("1 clean day, 2 urges logged.");
    expect(monthLetterAsk(now)).toContain("1 clean day, 2 urges logged.");
  });
});
