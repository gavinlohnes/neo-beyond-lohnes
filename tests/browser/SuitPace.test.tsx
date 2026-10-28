import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logProtein, logWater, performDueDayRollover, startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** SUIT-ALIVE S5: pace and the dark cockpit — today's water and protein against your usual by now. Read-only. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

// 12 finished days (no declared context, so pace compares all days), each with 20 oz of water and 40 g of protein logged an hour into the lived day.
async function seedHistory() {
  vi.useFakeTimers({ toFake: ["Date"] });
  for (let d = 1; d <= 12; d++) {
    vi.setSystemTime(new Date(2026, 9, d, 16, 35));
    await performDueDayRollover();
    const day = await startDay();
    vi.setSystemTime(new Date(2026, 9, d, 17, 30));
    await logWater(day.id, 20); await logProtein(day.id, 40);
  }
  vi.setSystemTime(new Date(2026, 9, 13, 16, 35));
  await performDueDayRollover();
  const today = await startDay();
  return today;
}

it.each([320, 390])("lights what's behind your usual pace and dims what's on it, writing nothing, at %ipx", async (width) => {
  await page.viewport(width, 820);
  const today = await seedHistory();
  await logProtein(today.id, 45);
  vi.setSystemTime(new Date(2026, 9, 13, 17, 45));
  const before = await db.events.toArray();
  const screen = await render(<App />);

  const water = screen.getByRole("button", { name: "Water 0 oz, behind your usual pace, explore records" });
  await expect.element(water).toBeVisible();
  await expect.element(water.getByText("BEHIND PACE", { exact: true })).toBeVisible();
  const protein = screen.getByRole("button", { name: /^Protein 45 .*g, on or ahead of your usual pace, explore records$/ });
  await expect.element(protein).toHaveClass("cc-steady");
  expect(water.element().classList.contains("cc-steady")).toBe(false);

  // Comms names it: today's water against your usual by now.
  // Ahead of pace (protein) is steady, not off-normal.
  await expect.element(screen.getByRole("button", { name: "Comms: Water 0 oz, under your usual 20 oz by now. Open tonight in the cave" })).toBeVisible();

  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.querySelector(".today-numbers")!)).violations).toEqual([]);
  expect(await db.events.toArray()).toEqual(before);
});

it("the cave judges water by pace, not a full day", async () => {
  const today = await seedHistory();
  await logWater(today.id, 8);
  vi.setSystemTime(new Date(2026, 9, 13, 17, 45));
  const screen = await render(<App />);
  await screen.getByRole("button", { name: /^Comms: / }).click();
  await screen.getByRole("button", { name: "VITALS", exact: true }).click();
  await screen.getByRole("button", { name: "WATER", exact: true }).click();
  const cave = screen.getByRole("region", { name: "THE CAVE // VITALS" });
  await expect.element(cave.getByText("Behind your usual pace: usually 20 oz by now. A usual full day is 20 oz–20 oz.", { exact: true })).toBeVisible();
});
