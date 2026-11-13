import { expect, it } from "vitest";
import { deriveAhead } from "../src/application/ahead";
import type { WeekAheadDay } from "../src/application/weekAheadQueries";

/** OPERATOR-EXPERIENCE-001: NEXT names the next switch between work and off, and where it came from. */
const d = (date: string, work: "WORK" | "OFF", basis: WeekAheadDay["basis"] = "PREDICTED"): WeekAheadDay =>
  ({ date, work, basis, shiftStartHour: work === "WORK" && basis !== "UNKNOWN" ? 18 : null, suggestedTemplate: null } as WeekAheadDay);
// Week B from Mon Nov 16 2026: Wed 18/Thu 19 work, Fri 20–Sun 22 off.
const week = [d("2026-11-18", "WORK"), d("2026-11-19", "WORK"), d("2026-11-20", "OFF"), d("2026-11-21", "OFF"), d("2026-11-22", "OFF"), d("2026-11-23", "WORK"), d("2026-11-24", "WORK")];

it("in a work run, names the next day off as a forecast", () => {
  const ahead = deriveAhead(new Date(2026, 10, 18, 20), "WORK", week)!;
  expect(ahead.line).toBe("Next day off: Fri, Nov 20 · forecast");
  expect(ahead.why).toBe("Next: a day off on Fri, Nov 20, from your saved schedule (a forecast, not a record).");
});

it("respects 16:30: at 09:00 Wed (still Tuesday's lived day) tonight's shift is next", () => {
  expect(deriveAhead(new Date(2026, 10, 18, 9), "OFF", week)!.line).toBe("Next shift: Wed, Nov 18 · 18:00 · forecast");
  // From 16:30 Wed's lived day has started; it is today, not next.
  expect(deriveAhead(new Date(2026, 10, 18, 16, 30), "WORK", week)!.line).toBe("Next day off: Fri, Nov 20 · forecast");
});

it("says when the next switch is a confirmed change, and counts other confirmed changes", () => {
  const changed = week.map((x) => x.date === "2026-11-20" ? d(x.date, "WORK", "CONFIRMED") : x.date === "2026-11-23" ? d(x.date, "OFF", "CONFIRMED") : x);
  const ahead = deriveAhead(new Date(2026, 10, 19, 20), "WORK", changed)!;
  expect(ahead.line).toBe("Next day off: Sat, Nov 21 · forecast · 2 confirmed changes ahead");
  expect(ahead.confirmed).toBe(2);
  expect(deriveAhead(new Date(2026, 10, 22, 20), "OFF", changed)!.line).toBe("Next shift: Tue, Nov 24 · 18:00 · forecast · 1 confirmed change ahead");
  expect(deriveAhead(new Date(2026, 10, 19, 20), "OFF", changed)!.line).toBe("Next shift: Fri, Nov 20 · 18:00 · confirmed change · 1 confirmed change ahead");
});

it("never guesses: unknown days say so; no switch in sight says that", () => {
  expect(deriveAhead(new Date(2026, 10, 18, 20), null, week.map((x) => d(x.date, "OFF", "UNKNOWN")))!.line).toBe("Next days: work or off not known · no saved schedule");
  expect(deriveAhead(new Date(2026, 10, 20, 20), "OFF", week.slice(2, 5))!.line).toBe("No switch in the next 2 days · off throughout");
  expect(deriveAhead(new Date(2026, 10, 30, 20), "OFF", week)).toBeNull();
});
