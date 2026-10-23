import { openDetailedReviews } from "./helpers/review";
import { commandResult } from "./helpers/command";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay, endDay, logProtein, logBodyweight, logSleep } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { ReviewAnswers } from "../../src/ui/screens/review/ReviewAnswers";
import { getReviewOverview } from "../../src/application/reviewOverviewQueries";
import "../../src/ui/styles/fonts";
vi.mock("../../src/application/reviewOverviewQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/reviewOverviewQueries")>();
  return { ...actual, getReviewOverview: vi.fn(actual.getReviewOverview) };
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.mocked(getReviewOverview).mockClear(); await page.viewport(1280, 800); });
async function seed() {
  vi.useFakeTimers({ toFake: ["Date"] });
  for (let index = 14; index > 0; index--) {
    vi.setSystemTime(new Date(2026, 9, 20 - index, 20));
    const day = await startDay(); await logBodyweight(day.id, index > 7 ? 182 : 180);
    await logProtein(day.id, 100); await logSleep(day.id, 420, "PRIMARY"); await endDay(day.id);
  }
  vi.setSystemTime(new Date(2026, 9, 20, 20)); await startDay();
}
for (const width of [320, 360, 412]) it(`connects Review answers to source History and returns at ${width}px without writes`, async () => {
  await page.viewport(width, 800); await seed(); const before = await db.events.toArray();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "MORE", exact: true }).click();
  await (await commandResult(screen, "REVIEW")).click();
  await openDetailedReviews(screen);
  await expect.element(screen.getByText("2.0 lb lower · latest 7-day mean versus previous 7", { exact: true })).toBeVisible();
  await screen.getByText("Is my weight going down?", { exact: true }).click();
  await screen.getByText("How this is calculated", { exact: true }).first().click();
  await expect.element(screen.getByText(/Average effective weigh-ins within each completed lived day/)).toBeVisible();
  await screen.getByRole("combobox", { name: "Open recorded day", exact: true }).selectOptions(new Date(2026, 9, 6, 16, 30).toISOString());
  await expect.element(screen.getByText("Oct 6 · 182.0 lb · 1 recorded day segment", { exact: true })).toBeVisible();
  await screen.getByText("Every record in this range", { exact: true }).first().click();
  const source = screen.getByRole("button", { name: "Open source day Oct 6, segment 1", exact: true });
  await source.click();
  await expect.element(screen.getByText("MORE // HISTORY", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "BACK TO REVIEW", exact: true }).click();
  await expect.element(screen.getByText("Oct 6 · 182.0 lb · 1 recorded day segment", { exact: true })).toBeVisible();
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Open source day Oct 6, segment 1");
  await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect(await db.events.toArray()).toEqual(before);
  expect((await axe.run(document.querySelector("main")!)).violations).toEqual([]);
});
it("shows explicit missing-data states and supports a failed read retry", async () => {
  vi.mocked(getReviewOverview).mockRejectedValueOnce(new Error("Synthetic read failure"));
  const screen = await render(<ReviewAnswers />);
  await expect.element(screen.getByRole("alert")).toHaveTextContent("unavailable, not empty");
  await screen.getByRole("button", { name: "RETRY ANSWERS", exact: true }).click();
  await expect.element(screen.getByText("Building up · needs 7 weighed days in the last 14, with 3 in each week", { exact: true })).toBeVisible();
  await screen.getByText("Is my weight going down?", { exact: true }).click();
  expect(screen.getByRole("img").elements()).toHaveLength(0);
  await screen.getByText("Every record in this range", { exact: true }).first().click();
  await expect.element(screen.getByText("No completed source days in this window.", { exact: true }).first()).toBeVisible();
});
