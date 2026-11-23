import { describe, expect, it } from "vitest";
import { deriveMealPrompt, windowFuelLine, type EatingWindowState, type LoggedMeal } from "../src/application/eatingWindow";

/** GRAYSON C4.8b: a logged meal offers a boundary, never sets one; protein against the window as plain facts. */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const meal = (name: string, d: Date, id = name): LoggedMeal => ({ name, at: d.toISOString(), rootEventId: id });
const fasting: EatingWindowState = { kind: "FASTING", since: at(15, 0).toISOString(), elapsedMinutes: 130, opensAt: "14:00", context: "", markId: "m" };
const open = (left: number): EatingWindowState => ({ kind: "OPEN", since: at(15, 14).toISOString(), leftMinutes: left, closesAt: "00:00", markId: "o" });
const planned: EatingWindowState = { kind: "PLANNED", opensAt: "14:00", closesAt: "00:00" };
const none = new Set<string>();

describe("deriveMealPrompt", () => {
  it("offers END FAST at the first meal logged after the fast began, ignoring meals before it and ahead of now", () => {
    const meals = [meal("Chili", at(14, 22)), meal("Bowl", at(15, 2, 10)), meal("Shake", at(15, 3)), meal("Pre-log", at(15, 9))];
    expect(deriveMealPrompt(fasting, meals, at(15, 4), null, none)).toEqual({ kind: "END_AT", at: at(15, 2, 10).toISOString(), name: "Bowl", mealId: "Bowl" });
    expect(deriveMealPrompt(fasting, [meal("Chili", at(14, 22))], at(15, 4), null, none)).toBeNull();
  });
  it("offers FAST FROM the last meal only near or past the window's end", () => {
    const meals = [meal("Lunch", at(15, 15)), meal("Dinner", at(15, 21, 40))];
    expect(deriveMealPrompt(open(150), meals, at(15, 21, 50), null, none)).toBeNull();
    expect(deriveMealPrompt(open(60), meals, at(15, 23), null, none)).toMatchObject({ kind: "START_FROM", name: "Dinner" });
    expect(deriveMealPrompt(open(0), [meal("Breakfast", at(15, 9))], at(15, 23), null, none)).toBeNull(); // before the window opened
  });
  it("with no marks today, offers FAST FROM the last meal once the planned window is over", () => {
    const meals = [meal("Dinner", at(15, 21, 40))];
    expect(deriveMealPrompt(planned, meals, at(15, 23), at(16, 0), none)).toBeNull();
    expect(deriveMealPrompt(planned, meals, at(16, 0, 5), at(16, 0), none)).toMatchObject({ kind: "START_FROM", name: "Dinner" });
  });
  it("offers only a time inside today's lived day, where the mark is placed, skipping an earlier day's meal", () => {
    const today = { start: at(15, 16, 30), end: at(16, 16, 30) };
    const meals = [meal("Snack", at(15, 15)), meal("Dinner", at(15, 17, 30))];
    expect(deriveMealPrompt(fasting, meals, at(15, 18), null, none, today)).toMatchObject({ kind: "END_AT", name: "Dinner" });
    expect(deriveMealPrompt(fasting, [meal("Snack", at(15, 15))], at(15, 18), null, none, today)).toBeNull();
  });
  it("NOT NOW keeps that offer away; a later meal can still offer", () => {
    const meals = [meal("Bowl", at(15, 2, 10))];
    expect(deriveMealPrompt(fasting, meals, at(15, 4), null, new Set(["END_AT:Bowl"]))).toBeNull();
    expect(deriveMealPrompt({ kind: "SKIPPED", skipId: "s" }, meals, at(15, 4), null, none)).toBeNull();
  });
});

describe("windowFuelLine", () => {
  it("states protein against the window while it's open, and nothing otherwise", () => {
    expect(windowFuelLine({ proteinG: 76, targetG: 170, leftG: 94 }, open(130))).toBe("Protein 76 / 170 g · 94 g left with 2:10 of window.");
    expect(windowFuelLine({ proteinG: 120, targetG: 170, leftG: 50 }, open(0))).toBe("Protein 120 / 170 g · 50 g left and the planned window is up.");
    expect(windowFuelLine({ proteinG: 180, targetG: 170, leftG: 0 }, open(30))).toBe("Protein 180 / 170 g. Target met.");
    expect(windowFuelLine({ proteinG: 76, targetG: 170, leftG: 94 }, fasting)).toBeNull();
  });
  it("never uses failure or level words", () => {
    const text = [windowFuelLine({ proteinG: 10, targetG: 170, leftG: 160 }, open(5))].join(" ");
    expect(text).not.toMatch(/fail|miss|behind|broke|level|unlock|streak/i);
  });
});
