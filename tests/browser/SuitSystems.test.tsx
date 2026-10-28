import { commandResult } from "./helpers/command";
import { afterEach, expect, it, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logProtein, logSleep, logWater, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** SUIT-001: the SYSTEMS line on TODAY and its read-only readout. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });
function clock(date = new Date(2026, 9, 16, 20)) { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(date); }

for (const width of [320, 360, 412]) it(`shows the SYSTEMS line and opens the readout and returns at ${width}px without writes`, async () => {
  await page.viewport(width, 800);
  clock();
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
  await logSleep(day.id, 410, "PRIMARY"); await logProtein(day.id, 40); await logWater(day.id, 16);
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const before = await db.events.toArray();
  const screen = await render(<App />);
  const line = await commandResult(screen, "SYSTEMS");
  await expect.element(line).toBeVisible();
  expect(line.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  await line.click();
  await expect.element(screen.getByRole("heading", { name: "MORE // SYSTEMS", exact: true })).toBeVisible();
  for (const group of ["BODY", "TRAINING", "STATE", "DEVICE"]) await expect.element(screen.getByRole("heading", { name: group, exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Last main sleep: 6h 50m. Logged 20:00. Open in the cave" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Protein: 40 g. No target set. Open in the cave" })).toBeVisible();
  const state = screen.getByRole("region", { name: "STATE" });
  await expect.element(state.getByText("Day off", { exact: true })).toBeVisible();
  await expect.element(state.getByText("Set by you", { exact: true })).toBeVisible();
  await expect.element(state.getByText("OFF DUTY", { exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  await screen.getByRole("button", { name: "BACK TO MORE", exact: true }).click();
  await expect.poll(() => document.activeElement?.getAttribute("aria-label") ?? "").toMatch(/^SYSTEMS /);
  expect(await db.events.toArray()).toEqual(before);
});

it("SUIT-ALIVE S2: a vital opens the cave in place, and its full history is one tap further", async () => {
  clock();
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL"); await logWater(day.id, 8);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "MORE", exact: true }).click();
  await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("systems");
  await screen.getByRole("button", { name: /^SYSTEMS / }).click();
  const water = screen.getByRole("button", { name: "Water: 8 oz. Open in the cave" });
  await water.click();
  await expect.element(screen.getByRole("heading", { name: "THE CAVE // VITALS", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
  await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("water");
  await screen.getByRole("button", { name: "BACK TO MORE", exact: true }).click();
  await expect.poll(() => document.activeElement?.textContent).toBe("FULL HISTORY");
  await screen.getByRole("button", { name: "BACK TO SYSTEMS", exact: true }).click();
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Water: 8 oz. Open in the cave");
});

for (const [level, values, words] of [
  ["GREEN", { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 }, "check-in clear, 0 hard sessions in 4 days"],
  ["AMBER", { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 2 }, null],
  ["RED", { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 5 }, null],
] as const) it(`keeps the full ${level} System Status in STATE and its word on the TODAY line`, async () => {
  const day = await startDay();
  await submitCheckIn(day.id, values);
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "Open LOG", exact: true })).toBeVisible();
  // FIELD-AUTHORITY-001: TODAY's line carries the level only when the next card isn't already speaking.
  const realNext = document.querySelector(".console-guidance .all-clear") === null;
  if (level === "GREEN" || realNext) expect(document.querySelector(".today-system-signal [data-system-status]")).toBeNull();
  else await expect.poll(() => document.querySelector(".today-system-signal [data-system-status]")?.textContent).toContain(level);
  await (await commandResult(screen, "SYSTEMS")).click();
  const state = screen.getByRole("region", { name: "STATE" });
  await expect.element(state.getByText(level, { exact: true }).first()).toBeVisible();
  if (words) await expect.element(state.getByText(words, { exact: true })).toBeVisible();
});

it("explains NO READ and missing readings plainly", async () => {
  await startDay();
  const screen = await render(<App />);
  // FIELD-AUTHORITY-001: TODAY says "not checked in" once (its check-in line); SYSTEMS explains it.
  await expect.element(screen.getByRole("button", { name: "CHECK IN", exact: true })).toBeVisible();
  expect(screen.getByRole("button", { name: /STATUS · / }).elements()).toHaveLength(0);
  await (await commandResult(screen, "SYSTEMS")).click();
  await expect.element(screen.getByText("NOT CHECKED IN", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Log sleep or check in.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Not logged", { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText("None yet", { exact: true })).toBeVisible();
});
