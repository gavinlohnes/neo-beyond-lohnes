import { openDetailedReviews } from "./helpers/review";
import { commandResult } from "./helpers/command";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { endDay, logBodyweight, logSleep, startDay } from "../../src/application/commands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { db } from "../../src/persistence/db";

/** REVIEW-001 "Is my weight going down, and at what rate?": rate, usual swing, goal date, weigh-in timing. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

async function seed({ sleepFirst }: { sleepFirst: boolean }) {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Completed lived days alternating by 0.5 lb: previous week mean 201.21, latest 199.79 (−1.43 lb).
  // 15 days so the existing goal projection's 14-day span floor is met.
  for (let index = 15; index > 0; index--) {
    vi.setSystemTime(new Date(2026, 9, 20 - index, 20));
    const day = await startDay();
    const weight = (index > 7 ? 201 : 199.5) + (index % 2 ? 0.5 : 0);
    if (sleepFirst) await logSleep(day.id, 420, "PRIMARY");
    vi.setSystemTime(new Date(2026, 9, 20 - index, 20, 5));
    await logBodyweight(day.id, weight);
    if (!sleepFirst) { vi.setSystemTime(new Date(2026, 9, 20 - index, 20, 10)); await logSleep(day.id, 420, "PRIMARY"); }
    await endDay(day.id);
  }
  vi.setSystemTime(new Date(2026, 9, 20, 20)); await startDay();
}
async function openWeight() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "MORE", exact: true }).click();
  await (await commandResult(screen, "REVIEW")).click();
  await openDetailedReviews(screen);
  await screen.getByText("Is my weight going down?", { exact: true }).click();
  return screen;
}

for (const width of [320, 360, 412]) it(`adds rate, usual swing, goal date and timing to the weight answer at ${width}px, writing nothing`, async () => {
  await page.viewport(width, 800);
  await seed({ sleepFirst: true });
  await updateNutritionTargets({ goalWeightLbs: 190 });
  const before = await db.events.count();
  const screen = await openWeight();
  const details = screen.getByRole("definition").filter({ hasText: "lb per week" });
  await expect.element(details).toHaveTextContent("-1.4 lb per week · -0.71% of bodyweight per week");
  await expect.element(screen.getByText(/^±0\.5 lb day to day · median of 14 consecutive-day pairs$/)).toBeVisible();
  await expect.element(screen.getByText(/^Goal 190 lb: about .+ at the last 28 days' pace\.$/)).toBeVisible();
  await expect.element(screen.getByText("15 of 15 weigh-ins logged after that day's main-sleep log", { exact: true })).toBeVisible();
  await screen.getByText("How these are calculated", { exact: true }).click();
  await expect.element(screen.getByText(/A daily change smaller than this is within your usual swing\./)).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  const block = document.querySelector<HTMLElement>(".review-weight-details")!;
  expect((await axe.run(block, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations).toEqual([]);
  expect(await db.events.count()).toBe(before);
});

it("counts weigh-ins logged before the main-sleep log, and says when no goal is set", async () => {
  await seed({ sleepFirst: false });
  const screen = await openWeight();
  await expect.element(screen.getByText("0 of 15 weigh-ins logged after that day's main-sleep log", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("No goal weight set. Set one in MORE → Nutrition targets.", { exact: true })).toBeVisible();
});
