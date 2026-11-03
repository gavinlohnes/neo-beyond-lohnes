import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { InsightsExplorer } from "../../src/ui/screens/body/InsightsExplorer";
import { WeightTrend } from "../../src/ui/screens/body/WeightTrend";
import type { BodyInsights } from "../../src/application/bodyInsightsQueries";

afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });

it("uses one inspectable suit-data grammar at phone width without changing recorded values", async () => {
  await page.viewport(320, 800);
  const readAt = "2026-11-02T18:00:00.000Z";
  const data: BodyInsights = { readAt, days: [
    { id: "one", at: "2026-10-20T18:00:00.000Z", active: false, calories: 1600, protein: 90, water: 64, sleep: 6.5, mainSleepEntries: 1, workouts: 1 },
    { id: "two", at: "2026-10-30T18:00:00.000Z", active: false, calories: 1800, protein: 110, water: 80, sleep: 7.5, mainSleepEntries: 1, workouts: 2 },
  ] };
  const weights = [
    { recordedAt: "2026-10-20T18:00:00.000Z", weightLbs: 202 },
    { recordedAt: "2026-10-30T18:00:00.000Z", weightLbs: 199 },
  ];
  const screen = await render(<main className="body-field"><InsightsExplorer data={data} weights={weights} goalWeightLbs={190} /><WeightTrend history={weights} goalWeightLbs={190} /></main>);
  expect(screen.container.querySelectorAll(".suit-data-frame").length).toBeGreaterThanOrEqual(2);
  expect(screen.container.querySelectorAll(".suit-data-selection").length).toBeGreaterThanOrEqual(2);
  await expect.element(screen.getByRole("status")).toHaveTextContent("199.0 lb");
  const slider = screen.getByRole("slider", { name: "Open recorded observation" });
  slider.element().focus();
  await userEvent.keyboard("{Home}");
  await expect.element(screen.getByRole("status")).toHaveTextContent("202.0 lb");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  expect((await axe.run(screen.container)).violations).toEqual([]);
});
