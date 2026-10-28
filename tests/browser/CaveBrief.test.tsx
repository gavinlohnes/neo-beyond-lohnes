import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logWater, markWorkEnded, noteShiftHandoff, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** SUIT-ALIVE S6: preflight before the shift, after-action after it — on TODAY's band and in the cave's BRIEF. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

for (const width of [320, 390]) it(`runs the preflight poll and closes items through their own commands at ${width}px`, async () => {
  await page.viewport(width, 820);
  vi.useFakeTimers({ toFake: ["Date"] });
  // Last shift (Thu) left a note.
  vi.setSystemTime(new Date(2026, 9, 15, 16, 40));
  const thu = await startDay(); await setWorkContext(thu.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(2026, 9, 16, 6, 5));
  await noteShiftHandoff(thu.id, "Eat at the break, not after");
  // Tonight (Fri, 18:00 shift per schedule): checked in, no water, nothing packed.
  vi.setSystemTime(new Date(2026, 9, 16, 16, 40));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  await submitCheckIn(day.id, { energy: 3, stress: 2, mood: 3, soreness: 2, alcoholUrge: 0 });
  vi.setSystemTime(new Date(2026, 9, 16, 17, 20));
  const screen = await render(<App />);

  const band = screen.getByRole("button", { name: /^Preflight, shift 18:00\. Hold: .*\. Open the brief in the cave$/ });
  await expect.element(band).toBeVisible();
  await band.click();
  await expect.element(screen.getByRole("heading", { name: "THE CAVE // BRIEF", exact: true })).toBeVisible();
  const cave = screen.getByRole("region", { name: "THE CAVE // BRIEF" });
  await expect.element(cave.getByText("T–00:40", { exact: true })).toBeVisible();
  await expect.element(cave.getByRole("status").getByText("Hold: sleep, fuel, hydration, food, bottle and handoff.", { exact: true })).toBeVisible();
  const systems = cave.getByRole("list", { name: "Systems" });
  await expect.poll(() => [...systems.element().querySelectorAll(".brief__state")].map((e) => e.textContent)).toEqual(["HOLD", "GO", "HOLD", "HOLD", "HOLD", "HOLD", "HOLD"]);

  for (const animation of document.getAnimations()) animation.finish();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.querySelector(".cave")!)).violations).toEqual([]);

  // Close the bottle and the note right here, through the existing commands.
  await cave.getByRole("listitem").filter({ hasText: "PACK · BOTTLE" }).getByRole("button", { name: "READY", exact: true }).click();
  await expect.element(cave.getByText("Bottle recorded. Change it on TODAY any time.", { exact: true })).toBeVisible();
  await cave.getByRole("button", { name: "READ IT", exact: true }).click();
  await expect.element(cave.getByText("Eat at the break, not after", { exact: true })).toBeVisible();
  await cave.getByRole("button", { name: "GOT IT", exact: true }).click();
  await expect.element(cave.getByText("Note marked read.", { exact: true })).toBeVisible();
  await expect.poll(() => [...systems.element().querySelectorAll(".brief__state")].map((e) => e.textContent)).toEqual(["HOLD", "GO", "HOLD", "HOLD", "HOLD", "GO", "GO"]);
  expect(await db.events.where("type").equals("PREPARATION_RECORDED").count()).toBe(1);
  expect(await db.events.where("type").equals("SHIFT_HANDOFF_READ").count()).toBe(1);
});

it("after the shift, TODAY offers the debrief and the cave sets planned beside actual", async () => {
  (globalThis as { __beyondShiftChange?: boolean }).__beyondShiftChange = true;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 16, 16, 40));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(2026, 9, 16, 20, 0)); await logWater(day.id, 24);
  vi.setSystemTime(new Date(2026, 9, 17, 5, 40)); await markWorkEnded(day.id);
  vi.setSystemTime(new Date(2026, 9, 17, 6, 30));
  const before = await db.events.toArray();
  const screen = await render(<App />);
  // SHIFT-CHANGE-001: the end of the shift takes the screen once first, from the real end.
  await expect.element(screen.getByRole("dialog", { name: "Shift secured. 11:40 on the clock." })).toBeVisible();
  await screen.getByRole("button", { name: "CONTINUE", exact: true }).click();
  await screen.getByRole("button", { name: /^After-action ready\. Shift's done\. Here's how it went against the plan\. Open the brief/ }).click();
  const cave = screen.getByRole("region", { name: "THE CAVE // BRIEF" });
  await expect.element(cave.getByRole("button", { name: "AFTER-ACTION", exact: true })).toHaveAttribute("aria-pressed", "true");
  const table = cave.getByRole("table", { name: "After-action: planned and actual" });
  await expect.element(table.getByRole("row").filter({ hasText: "SHIFT" }).first()).toHaveTextContent("SHIFT18:00–06:00Ended 05:40");
  await expect.element(table.getByRole("row").filter({ hasText: "MEAL BEFORE" })).toHaveTextContent("MEAL BEFOREBy 18:00None logged · off plan");
  await expect.element(table.getByRole("row").filter({ hasText: "WATER" })).toHaveTextContent("WATERLearning your usual24 oz");
  expect(await db.events.toArray()).toEqual(before);
});
