import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { getHydrationEntries } from "../../src/application/queries";
import { getMealEntries } from "../../src/application/nutritionQueries";
import { seedRotation } from "./helpers/rotation";

/**
 * FIELD-REHEARSAL-002: one whole shift, driven only through the screens, on eight weeks of the
 * owner's rotation. The app is opened at each moment the way a phone is picked up: before the
 * shift, after a meal, mid-shift, landing, and after. Every stop: no overflow, axe AA clean.
 */
const SHOTS = import.meta.env.VITE_REHEARSAL_SHOTS as string | undefined;
const hhmm = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const t = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);

beforeEach(async () => {
  (globalThis as { __beyondShiftChange?: boolean }).__beyondShiftChange = true;
  await seedRotation();
  await page.viewport(360, 800);
}, 120_000);
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function open(at: Date, label: string) {
  await cleanup();
  vi.setSystemTime(at);
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "DATA", exact: true })).toBeVisible();
  await new Promise((done) => setTimeout(done, 500));
  await settle();
  await check(label);
  return screen;
}
async function settle() { await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))); }
async function check(label: string) {
  expect(document.documentElement.scrollWidth > window.innerWidth, `${label} overflows`).toBe(false);
  const result = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/shift-${label}.png` });
}

it("walks one whole shift through the screens: preflight, a late-logged meal, a moved drink, landing, secured", async () => {
  // 16:45 — the day starts with one tap; PREFLIGHT then takes the screen once; STARTED WORK in it.
  let screen = await open(t(27, 16, 45), "1-start-day");
  await screen.getByRole("button", { name: "START DAY", exact: true }).click();
  const preflight = screen.getByRole("dialog", { name: /^Preflight\./ });
  await expect.element(preflight).toBeVisible();
  await settle(); await check("1-preflight");
  await preflight.getByRole("button", { name: "STARTED WORK", exact: true }).click();
  await expect.element(screen.getByText("ON THE CLOCK · 16:45", { exact: true })).toBeVisible();

  // 17:30 — no moment now; a quick-add meal eaten at 17:10, logged late.
  screen = await open(t(27, 17, 30), "2-after-start");
  expect(document.querySelector(".shift-change")).toBeNull();
  await screen.getByRole("button", { name: "Log a meal", exact: true }).click();
  let sheet = screen.getByRole("dialog", { name: "MEAL", exact: true });
  await sheet.getByRole("textbox", { name: "Pick a time" }).fill("17:10");
  await sheet.getByRole("button", { name: "QUICK ADD", exact: true }).click();
  sheet = screen.getByRole("dialog", { name: /QUICK ADD|MEAL/ });
  await sheet.getByLabelText("Quick add Calories").fill("600");
  await sheet.getByLabelText("Quick add Protein").fill("45");
  await sheet.getByRole("button", { name: "LOG", exact: true }).click();
  await expect.poll(async () => (await getMealEntries((await db.beyondDays.orderBy("startedAt").last())!.id)).map((m) => hhmm(new Date(m.at)))).toEqual(["17:10"]);
  await check("2-meal-logged");

  // 21:00 — water now, then moved: it was really drunk at 20:30.
  screen = await open(t(27, 21), "3-mid-shift");
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
  await sheet.getByRole("button", { name: "+16 oz", exact: true }).click();
  await expect.element(screen.getByText("16 oz recorded.", { exact: true })).toBeVisible();
  // The comms line re-reads at once: never "Water 0 oz" after a drink.
  await expect.poll(() => document.querySelector(".comms-line__text")?.textContent ?? "").not.toMatch(/Water 0 oz/);
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
  await sheet.getByRole("button", { name: "Custom amount & entries", exact: true }).click();
  await sheet.getByText(/SHOW TODAY.S ENTRIES/).click();
  await sheet.getByRole("button", { name: /^Change the time of this water log, now 21:00/ }).click();
  await sheet.getByLabelText("New time for this water log").fill("20:30");
  await sheet.getByRole("button", { name: "SAVE TIME", exact: true }).click();
  const dayId = (await db.beyondDays.orderBy("startedAt").last())!.id;
  await expect.poll(async () => (await getHydrationEntries(dayId)).map((w) => hhmm(new Date(w.at)))).toEqual(["20:30"]);
  await check("3-water-moved");

  // 05:30 — LANDING, the shift on one line: the 17:10 meal and the 20:30 drink.
  screen = await open(t(28, 5, 30), "4-landing");
  const landing = screen.getByRole("dialog", { name: /^Landing\./ });
  await expect.element(landing).toBeVisible();
  await expect.element(landing.getByRole("img", { name: "Your shift on one line, 16:45 to 06:00: 1 water log, 1 food log." })).toBeVisible();
  await landing.getByRole("button", { name: "CONTINUE", exact: true }).click();

  // 05:50 — work ends early, by one tap.
  screen = await open(t(28, 5, 50), "5-end-work");
  await expect.element(screen.getByText("ON THE CLOCK · 16:45", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "WORK ENDED", exact: true }).click();
  await expect.poll(async () => (await db.events.where("beyondDayId").equals(dayId).filter((e) => e.type === "WORK_PERIOD_ENDED").count())).toBe(1);

  // 06:30 — SHIFT SECURED, from the real start to the real end: 16:45 to 05:50.
  screen = await open(t(28, 6, 30), "6-secured");
  const secured = screen.getByRole("dialog", { name: "Shift secured. 13:05 on the clock." });
  await expect.element(secured).toBeVisible();
  await expect.element(secured.getByRole("img", { name: "Your shift on one line, 16:45 to 05:50: 1 water log, 1 food log." })).toBeVisible();
  await secured.getByRole("button", { name: "CONTINUE", exact: true }).click();
  await expect.element(secured).not.toBeInTheDocument();
  await check("6-after");
});
