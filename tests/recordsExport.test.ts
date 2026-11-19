import { beforeEach, expect, it, vi } from "vitest";
import { db } from "../src/persistence/db";
import { csvCell, getRecordsExport, toCsv } from "../src/application/recordsExport";
import { startDay, logBodyweight, correctBodyweight, logWater } from "../src/application/commands";
import { getBodyweightHistoryWithSources } from "../src/application/bodyTrendQueries";
import { logManualMeal } from "../src/application/nutritionCommands";

beforeEach(async () => { await db.delete(); await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });

it("EXPORT-001: cells follow RFC 4180, a formula-looking cell arrives as text, missing is empty, never 0", () => {
  expect(csvCell("Chicken, rice")).toBe('"Chicken, rice"');
  expect(csvCell('6" sub')).toBe('"6"" sub"');
  expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
  expect(csvCell("+1 shake")).toBe("'+1 shake");
  expect(csvCell("@home")).toBe("'@home");
  expect(csvCell("-3")).toBe("-3");
  expect(csvCell(-3)).toBe("-3");
  expect(csvCell(null)).toBe("");
  expect(csvCell(undefined)).toBe("");
  expect(csvCell(0)).toBe("0");
  expect(toCsv(["a", "b"], [[1, null], ["x", "y,z"]])).toBe('a,b\r\n1,\r\nx,"y,z"\r\n');
});

it("EXPORT-001: weight exports the corrected value once; days leave unlogged water empty; meals keep their names as text; nothing is written", async () => {
  try {
    vi.setSystemTime(new Date(2026, 10, 10, 18));
    const first = await startDay();
    await logBodyweight(first.id, 204);
    const [w] = await getBodyweightHistoryWithSources();
    await correctBodyweight(first.id, w!.headEventId, 203.4);
    await logManualMeal(first.id, { name: "=SUM(A1)", calories: 500, proteinG: 40, carbsG: 50, fatG: 10 });
    vi.setSystemTime(new Date(2026, 10, 11, 18));
    const second = await startDay();
    await logWater(second.id, 16);
    const before = await db.events.toArray();

    const weight = await getRecordsExport("weight");
    expect(weight.rows).toEqual([["2026-11-10", "18:00", 203.4, "lb", "you"]]);
    const days = await getRecordsExport("days");
    expect(days.header).toEqual(["lived_day", "work_or_off", "water_oz", "protein_g", "calories_eaten", "main_sleep_min", "steps", "steps_source"]);
    expect(days.rows.map((r) => [r[0], r[2]])).toEqual([["2026-11-10", undefined], ["2026-11-11", 16]]);
    expect(toCsv(days.header, days.rows).split("\r\n")[1]).toMatch(/^2026-11-10,,,40,500,,,$/);
    const meals = await getRecordsExport("meals");
    expect(toCsv(meals.header, meals.rows)).toContain("'=SUM(A1)");
    expect({ from: days.from, to: days.to }).toEqual({ from: "2026-11-10", to: "2026-11-11" });
    expect(await db.events.toArray()).toEqual(before);
    expect((await getRecordsExport("workouts")).rows).toEqual([]);
  } finally { vi.useRealTimers(); }
});
