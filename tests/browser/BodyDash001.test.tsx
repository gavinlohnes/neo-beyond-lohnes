import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logBodyweight, logProtein, logWater, startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { createHabit, setHabitDone } from "../../src/application/habitCommands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { importActivitySnapshot } from "../../src/application/externalActivityCommands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/**
 * BODY-DASH-001 (Gavin, 2026-11-14): DATA opens on the numbers — hydration, sleep, weight, nutrition, steps, resting HR
 * and lifestyle — from BEYOND's own records and Garmin's watch measurements, each saying where it came from, with the
 * existing logging and history one tap away, and the cave and shortcuts unchanged below. Synthetic data only.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const firstDay = new Date(2026, 8, 22, 16, 30).getTime();
const now = new Date(2026, 9, 21, 22, 10).getTime(); // day 29 of 30 is in progress (a work day)
/** No two visible parts of a card header overlap, and nothing spills out of its card. */
function assertNoCollisions(label: string) {
  const overlaps: string[] = [];
  for (const head of document.querySelectorAll<HTMLElement>(".bd-card__head, .bd-bar")) {
    const parts = [...head.children].filter((c) => (c as HTMLElement).offsetParent !== null && !c.classList.contains("visually-hidden")).map((c) => [c, c.getBoundingClientRect()] as const);
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const [a, ra] = parts[i]!, [b, rb] = parts[j]!;
      if (ra.left < rb.right - 0.5 && rb.left < ra.right - 0.5 && ra.top < rb.bottom - 0.5 && rb.top < ra.bottom - 0.5) overlaps.push(`${a.className}×${b.className}`);
    }
  }
  const spill = [...document.querySelectorAll<HTMLElement>(".bd-card")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.dataset.dash);
  expect({ overlaps, spill }, label).toEqual({ overlaps: [], spill: [] });
}
const card = (id: string) => document.querySelector<HTMLElement>(`[data-dash="${id}"]`);
const text = (id: string) => card(id)?.textContent ?? "";
const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
async function aa(label: string) {
  const r = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}

async function seed() {
  const { days, activity, sleep } = syntheticGarminMonth(firstDay, 30, now, { calories: true });
  await db.beyondDays.bulkAdd(days);
  await importActivitySnapshot(activity);
  await importSleepSnapshot(sleep);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  // Weigh-ins on past days, then today's logs.
  for (const [i, lbs] of [[15, 207.4], [20, 206.6], [24, 206.0], [28, 205.2]] as const) {
    vi.setSystemTime(firstDay + i * 86_400_000 + 3 * 3_600_000); await logBodyweight(days[i]!.id, lbs);
  }
  const today = days[29]!.id;
  for (const [h, oz] of [[1, 16], [3, 8], [4.5, 8]] as const) { vi.setSystemTime(firstDay + 29 * 86_400_000 + h * 3_600_000); await logWater(today, oz); }
  vi.setSystemTime(now - 3_600_000);
  const meal = await createSavedMeal({ name: "Chicken and rice", calories: 640, proteinG: 48, carbsG: 70, fatG: 14 });
  await logMeal(today, meal.id);
  const habit = await createHabit({ name: "Fasting", kind: "ANY_DAY" }); await setHabitDone(habit.id, true, today);
  await createHabit({ name: "Stretch", kind: "ANY_DAY" });
  await saveQuitHabit({ name: "Alcohol" });
  vi.setSystemTime(now);
}

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("BODY-DASH-001", () => {
  it("opens DATA on the numbers, with sources, quick logging, history and the cave intact", async () => {
    await page.viewport(360, 800);
    await seed();
    const screen = await render(<App />);
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await expect.element(screen.getByRole("region", { name: "Your numbers" })).toBeVisible();
    await expect.poll(() => text("steps")).toMatch(/GARMIN/);

    // Day context, from the record and the saved schedule.
    await expect.poll(() => document.querySelector("[data-dash-day]")!.textContent).toMatch(/^WED, OCT 21.*(Night shift|Shift) \d\d:\d\d–\d\d:\d\d$/);
    // Your logs are LOGGED; the watch's are GARMIN, with freshness.
    expect(text("water")).toMatch(/^HYDRATIONLOGGED.*32 oz/);
    expect(text("weight")).toContain("205.2 lb");
    expect(text("weight")).toMatch(/▼ -1\.4 lb · 8d/); // vs the weigh-in nearest a week before
    expect(text("weight")).not.toContain("Goal"); // no goal unless you set one
    expect(text("nutrition")).toMatch(/Eaten640 kcal/);
    expect(text("nutrition")).toMatch(/Protein48( \/ \d+)? g/);
    expect(text("nutrition")).toMatch(/Burned \(Garmin estimate\) [\d,]+ kcal/);
    expect(text("nutrition")).not.toMatch(/net|remaining|deficit/i);
    expect(text("sleep")).toMatch(/SLEEPGARMIN.*\dh \d\dm/);
    expect(document.querySelectorAll("[data-dash='sleep'] .bd-stages i").length).toBeGreaterThan(0);
    expect(text("steps")).toMatch(/STEPSGARMIN[\d,]+Usual work day [\d,]+/);
    expect(text("resting")).toMatch(/RESTING HRGARMIN\d+ bpm/);
    expect(text("lifestyle")).toContain("Fasting, done today✓");
    expect(text("lifestyle")).toContain("Stretch, not done yet today○");
    expect(text("lifestyle")).toContain("Alcohol ·");
    await aa("dashboard 360");
    assertNoCollisions("360");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    if (SHOTS) {
      // What opening DATA shows on a phone, then the whole dashboard on a tall screen.
      await settle(); await page.screenshot({ path: `${SHOTS}/body-dash-360-open.png` });
      await page.viewport(360, 1900); await settle(); await page.screenshot({ path: `${SHOTS}/body-dash-360-full.png` });
      await page.viewport(360, 800);
    }

    // Quick-add uses BODY's existing command and undo.
    const before = await db.events.where("type").equals("WATER_LOGGED").count();
    await screen.getByRole("group", { name: "Add water" }).getByRole("button", { name: "+8 oz" }).click();
    await expect.poll(() => text("water")).toContain("40 oz");
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/body-dash-360-water-undo.png`, element: card("water")! }); }
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(before + 1);
    await card("water")!.querySelector<HTMLButtonElement>(".bd-confirm button")!.click();
    await expect.poll(() => text("water")).toContain("32 oz");
    expect(await db.events.where("type").equals("WATER_LOG_VOIDED").count()).toBe(1);

    // History: steps open GARMIN-004's own sheet; water opens Progress; BACK TO DATA returns.
    await screen.getByRole("button", { name: "Open steps history" }).click();
    await expect.element(screen.getByRole("dialog")).toBeVisible();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/body-dash-360-steps-sheet.png` }); }
    await userEvent.keyboard("{Escape}");
    await screen.getByRole("button", { name: "Open water history" }).click();
    await expect.poll(() => [...document.querySelectorAll<HTMLButtonElement>("button")].some((b) => b.textContent === "BACK TO DATA" && b.offsetParent !== null)).toBe(true);
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "BACK TO DATA" && b.offsetParent !== null)!.click();
    await expect.element(screen.getByRole("region", { name: "Your numbers" })).toBeVisible();

    // Lifestyle links out to the existing tools rather than expanding a form inline.
    expect(card("lifestyle")!.querySelector("form, input")).toBeNull();
    await expect.element(screen.getByRole("button", { name: "QUIT TRACKER" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "HABITS" })).toBeVisible();

    // The cave's eight tabs and DATA's shortcuts are still there, below the dashboard.
    expect(document.querySelectorAll("[data-cave-tab]").length).toBe(8);
    const nav = screen.getByRole("navigation", { name: "DATA shortcuts" });
    for (const label of ["Weight", "Photos", "Measurements", "Whole picture", "Your rotation", "History"]) await expect.element(nav.getByRole("button", { name: label, exact: true })).toBeVisible();
    const dash = document.querySelector(".bd")!, shortcuts = document.querySelector("[aria-label='DATA shortcuts']")!, cave = document.querySelector("[data-cave-tab]")!;
    expect(dash.compareDocumentPosition(shortcuts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(shortcuts.compareDocumentPosition(cave) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    for (const width of [412, 768, 1024]) {
      await page.viewport(width, 900); await settle();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      assertNoCollisions(`${width}`);
      if (SHOTS) { await page.viewport(width, width > 700 ? 1300 : 1900); await settle(); await page.screenshot({ path: `${SHOTS}/body-dash-${width}.png` }); }
    }
  }, 60_000);

  it("never invents: no day, no logs and no Garmin read as missing, with no sources, goals or watch links", async () => {
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await expect.element(screen.getByRole("region", { name: "Your numbers" })).toBeVisible();
    await expect.poll(() => text("steps")).toContain("Not measured");
    expect(document.querySelector("[data-dash-day]")!.textContent).toContain("No day started");
    expect(text("water")).toContain("Not logged");
    expect(text("sleep")).toContain("Not logged");
    expect(text("weight")).toContain("Not logged");
    expect(text("nutrition")).toContain("No food logged");
    expect(text("resting")).toContain("Not measured");
    expect(document.querySelectorAll(".bd-src--garmin").length).toBe(0);
    expect(screen.getByRole("button", { name: "Open steps history" }).elements()).toHaveLength(0);
    expect(document.querySelector(".bd")!.textContent).not.toMatch(/Goal|% of|of 80/);
    await aa("dashboard empty");
  });

  it("says when Garmin's data is old", async () => {
    await page.viewport(360, 800);
    await seed();
    vi.setSystemTime(now + 14 * 3_600_000);
    const screen = await render(<App />);
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await expect.poll(() => [...document.querySelectorAll(".bd-src--garmin")].map((e) => e.textContent)).toContain("GARMIN · OLD");
    expect(text("sleep")).toMatch(/Garmin as of .* · \d+ h old/);
  });

  it("review of #512: protein alone shows protein, not \"0 kcal\" eaten; water's hours start at 16:30, not at day start", async () => {
    await page.viewport(360, 800);
    vi.setSystemTime(new Date(2026, 10, 18, 18, 2)); const day = await startDay();
    vi.setSystemTime(new Date(2026, 10, 18, 19)); await logProtein(day.id, 30); await logWater(day.id, 12);
    vi.setSystemTime(new Date(2026, 10, 18, 20));
    const screen = await render(<App />);
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await expect.poll(() => text("nutrition")).toContain("Protein30");
    expect(text("nutrition")).toContain("No meals logged");
    expect(text("nutrition")).not.toMatch(/Eaten|0 kcal/);
    expect([...card("water")!.querySelectorAll(".bd-axis span")].map((s) => s.textContent)).toEqual(["16:30", "NOW", "16:30"]);
  });

  it("stays readable with long values and names at 320 px (a zoomed phone), with no collisions or spill", async () => {
    await page.viewport(320, 800);
    vi.setSystemTime(new Date(2026, 10, 18, 18, 2)); const day = await startDay();
    vi.setSystemTime(new Date(2026, 10, 18, 19)); await logWater(day.id, 128); await logProtein(day.id, 312); await logBodyweight(day.id, 1234.5);
    const meal = await createSavedMeal({ name: "A very long named post-shift recovery meal", calories: 12840, proteinG: 0, carbsG: 0, fatG: 0 });
    await logMeal(day.id, meal.id);
    await createHabit({ name: "Read twenty pages before the night shift starts", kind: "ANY_DAY" });
    await saveQuitHabit({ name: "Late-night energy drinks" });
    vi.setSystemTime(new Date(2026, 10, 18, 20));
    const screen = await render(<App />);
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await expect.poll(() => text("weight")).toContain("1234.5");
    await expect.poll(() => text("lifestyle")).toContain("Read twenty pages");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    assertNoCollisions("320 long");
    await aa("dashboard 320 long");
    if (SHOTS) { await page.viewport(320, 1700); await settle(); await page.screenshot({ path: `${SHOTS}/body-dash-320-long.png` }); }
  });
});
