import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { RotationMap } from "../../src/ui/screens/review/RotationMap";
import type { PictureRow } from "../../src/application/wholePictureProjection";
import type { WeekAheadDay } from "../../src/application/weekAheadQueries";
import "../../src/ui/screens/review/wholePicture.css";

/** ROTATION-002: actogram, patterns across runs and the next window, from recorded rows only. */
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });

const start = (day: number) => new Date(2026, 8, day, 16, 30).toISOString();
const row = (day: number, context: PictureRow["context"], values: Partial<PictureRow> = {}) => ({
  start: start(day), dayIds: [`d${day}`], context, weights: [], sessions: 0, ambiguousSleep: false, checkIn: undefined, checkInCount: 0,
  energy: undefined, stress: undefined, mood: undefined, soreness: undefined, alcoholUrge: undefined, resting: undefined, steps: undefined, measuredHours: 0, ...values,
}) as PictureRow;
const work = (day: number, sleepHours: number, energy: number, timed = true) => row(day, "WORK", {
  sleepHours, energy, shiftWindow: { start: 90, end: 810 }, ...(timed ? { sleepWindow: { start: 930, end: 930 + sleepHours * 60 } } : {}),
});
// A cut run, then three whole runs of three shifts with two days off between them.
const rows: PictureRow[] = [
  work(1, 4, 1), row(2, "OFF", { sleepHours: 9 }), row(3, "OFF", { sessions: 1 }),
  work(4, 6, 4), work(5, 5, 3), work(6, 4.5, 2, false), row(7, "OFF", { sleepHours: 9.5 }), row(8, "OFF", { sessions: 1 }),
  work(9, 6.5, 4), work(10, 5, 3), work(11, 4, 2), row(12, "OFF", { sleepHours: 8.5 }), row(13, "OFF"),
  work(14, 6, 5), work(15, 5.5, 3), work(16, 5, 2),
];
const ahead = (date: string, w: "WORK" | "OFF"): WeekAheadDay => ({ date, work: w, shiftStartHour: null, suggestedTemplate: null, afterShift: false });
const weekAhead = [ahead("2026-09-17", "WORK"), ahead("2026-09-18", "OFF"), ahead("2026-09-19", "OFF"), ahead("2026-09-20", "WORK")];

for (const width of [320, 390, 1280]) it(`shows sleep against the shift, shift-by-shift patterns and the next window at ${width}px`, async () => {
  await page.viewport(width, 900);
  const onInspect = vi.fn();
  const screen = await render(<div className="whole-picture"><RotationMap rows={rows} weekAhead={weekAhead} readAt={new Date(2026, 8, 17, 20).toISOString()} onInspect={onInspect} /></div>);
  // Next window: forecast days off, last workout, and the most-trained day off with its counts.
  const window = document.querySelector("[data-rotation-window]")!;
  expect(window.textContent).toMatch(/Days off are forecast from Fri, Sep 18 · 2 days\./);
  expect(window.querySelector("details")!.open).toBe(false);
  expect(window.textContent).toMatch(/Last counted workout: Tue, Sep 8, 9 days ago\./);
  expect(window.textContent).toMatch(/trained most often on day off 2 \(2 of 3\)/);
  // Patterns: three whole work runs (the cut one is left out), means with sample sizes.
  await expect.element(screen.getByRole("heading", { name: "Shift by shift, over 3 work runs." })).toBeVisible();
  expect(document.querySelector("[data-unlock-goal]")).toBeNull();
  const shift1 = document.querySelector('[data-position="WORK:1"] summary')!.textContent!;
  expect(shift1).toMatch(/sleep 6:10 avg \(3 days\) · energy 4\.3 avg \(3\) · trained on 0 of 3/);
  expect(shift1).toMatch(/Usually asleep 08:00–14:00 \(3 Garmin-timed days\)/);
  expect(document.querySelector('[data-position="WORK:3"] summary')!.textContent).not.toMatch(/Usually asleep/);
  // Tap-through: a pattern opens the exact day behind it.
  await screen.getByText("Shift 2", { exact: true }).click();
  await screen.getByRole("button", { name: /^Shift 2, .*Sep 10.*Open records\.$/ }).click();
  expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ start: start(10) }));
  // Actogram and per-day times; an untimed day says nothing about times.
  expect(document.querySelectorAll(".actogram").length).toBeGreaterThan(0);
  await expect.element(screen.getByRole("button", { name: /shift 1 of 3: main sleep 6:00, asleep 08:00–14:00, energy 5/ })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /shift 3 of 3: main sleep 4:30, energy 2/ })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("says how many runs patterns still need, and stays honest with no forecast or workouts", async () => {
  await page.viewport(390, 900);
  const screen = await render(<div className="whole-picture"><RotationMap rows={rows.slice(0, 8)} weekAhead={[]} readAt={new Date(2026, 8, 9, 20).toISOString()} onInspect={() => {}} /></div>);
  await expect.element(screen.getByRole("heading", { name: "Patterns need 3 complete work runs (1 so far)." })).toBeVisible();
  expect(document.querySelector('[data-position="WORK:1"] summary')!.textContent).toMatch(/sleep avg after 2 more logged \(1 of 3\) · energy avg after 2 more check-ins \(1 of 3\)/);
  // DELTA-004: the abstention says what unlocks it.
  expect(document.querySelector("[data-unlock-goal]")!.textContent).toBe("Mark each day work or off and log main sleep and a check-in through 2 more work runs, and BEYOND can show shift-by-shift patterns.");
  expect(document.querySelector("[data-rotation-window]")!.textContent).not.toMatch(/trained most often/);
});

for (const width of [320, 1280]) it(`ROTATION-003: lines up recent flips, with usual times, naps and the next flip at ${width}px`, async () => {
  await page.viewport(width, 900);
  const onInspect = vi.fn();
  const screen = await render(<div className="whole-picture"><RotationMap rows={rows} weekAhead={weekAhead} readAt={new Date(2026, 8, 17, 20).toISOString()} onInspect={onInspect} /></div>);
  await expect.element(screen.getByRole("heading", { name: "6 recorded flips in the last 16 days." })).toBeVisible();
  expect(document.querySelector("[data-rotation-next-flip]")!.textContent).toBe("Next flip: out of work, Fri, Sep 18. See Flips for your records.");
  const into = document.querySelector('[data-flip-kind="INTO_WORK"]')!;
  expect(into.querySelector("h4")!.textContent).toBe("Into work · 3 flips");
  expect(into.textContent).toContain("Usually asleep: shift 1 08:00–14:00 (3 days) · shift 2 08:00–13:00 (3 days).");
  expect(into.querySelector("[data-flip-naps]")!.textContent).toBe("Napped the day before on 0 of 3 flips. A comparison needs 3 flips each way (napped 0, didn't 3).");
  const out = document.querySelector('[data-flip-kind="OUT_OF_WORK"]')!;
  expect(out.textContent).toContain("Usual sleep times need 3 Garmin-timed days at each point.");
  expect(out.querySelector("[data-flip-naps]")).toBeNull();
  // Newest flip first; it opens an aligned actogram and its exact days.
  const newest = into.querySelector("details summary")!;
  expect(newest.textContent).toBe("Into work · Mon, Sep 14");
  await screen.getByText("Into work · Mon, Sep 14", { exact: true }).click();
  await expect.element(screen.getByRole("img", { name: /^Into work, Mon, Sep 14: sleep and scheduled shift times for 3 days, 2 with Garmin sleep times/ })).toBeVisible();
  await screen.getByRole("button", { name: /^First night, .*Sep 14: main sleep 6:00, asleep 08:00–14:00, energy 5\. Open records\.$/ }).click();
  expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ start: start(14) }));
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("ROTATION-004: puts meals, water and workouts on the same line as sleep and the shift", async () => {
  await page.viewport(390, 900);
  const marked = rows.map((row, index) => index === 13 ? { ...row, marks: { meals: [345, 720], water: [670], workouts: [875] } } : row);
  const screen = await render(<div className="whole-picture"><RotationMap rows={marked} weekAhead={weekAhead} readAt={new Date(2026, 8, 17, 20).toISOString()} onInspect={() => {}} /></div>);
  await expect.element(screen.getByRole("button", { name: /shift 1 of 3: main sleep 6:00, asleep 08:00–14:00, energy 5, no workout; meals 22:15, 04:30 · workout 07:05 · water ×1\. Open records\.$/ })).toBeVisible();
  // The day also appears in its flip chart; count the run list only.
  const runsList = document.querySelector(".rotation-runs")!;
  expect(runsList.querySelectorAll(".actogram-meal")).toHaveLength(2);
  expect(runsList.querySelectorAll(".actogram-workout")).toHaveLength(1);
  expect(runsList.querySelectorAll(".actogram-water")).toHaveLength(1);
  expect(document.querySelector(".rotation-legend")!.textContent).toMatch(/sleep.*scheduled shift.*meal.*workout.*water/);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

