/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { BodyProgress } from "../../src/ui/screens/body/BodyProgress";
import { getBodyInsights, INSIGHT_DAY_MS, type BodyInsights } from "../../src/application/bodyInsightsQueries";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

vi.mock("../../src/application/bodyInsightsQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/bodyInsightsQueries")>();
  return { ...actual, getBodyInsights: vi.fn(actual.getBodyInsights) };
});
beforeEach(() => { vi.mocked(getBodyInsights).mockReset(); });
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });

function fixture() {
  const now = new Date();
  const at = (days: number) => new Date(now.getTime() - days * INSIGHT_DAY_MS).toISOString();
  const data: BodyInsights = { readAt: now.toISOString(), days: [
    { id: "old", at: at(40), active: false, calories: 1000, protein: 70, sleep: 6, mainSleepEntries: 1, workouts: 1, carbs: 90, fat: 30 },
    { id: "previous", at: at(10), active: false, calories: 800, protein: 80, sleep: 7, mainSleepEntries: 1, workouts: 0, carbs: 80, fat: 25 },
    { id: "zero", at: at(3), active: false, calories: 0, protein: 0, mainSleepEntries: 2, workouts: 0, carbs: 0, fat: 0 },
    { id: "recent", at: at(1), active: true, calories: 600, protein: 100, sleep: 8, mainSleepEntries: 1, workouts: 1, carbs: 50, fat: 20 },
  ] };
  const weights = [{ recordedAt: at(40), weightLbs: 195 }, { recordedAt: at(10), weightLbs: 190 }, { recordedAt: at(1), weightLbs: 185 }];
  return { data, weights };
}
const subject = (weights: ReturnType<typeof fixture>["weights"], refreshKey = 0) => <section className="body-field"><h2 id="health-progress-heading" tabIndex={-1}>Your progress</h2><BodyProgress refreshKey={refreshKey} weightHistory={weights} goalWeightLbs={180} /></section>;

describe("BODY Insights & Progress", () => {
  it("preserves the last-recorded weight graph for history older than all recent ranges", async () => {
    const { data } = fixture();
    vi.mocked(getBodyInsights).mockResolvedValue(data);
    const weights = [{ recordedAt: new Date(Date.parse(data.readAt) - 410 * INSIGHT_DAY_MS).toISOString(), weightLbs: 200 }, { recordedAt: new Date(Date.parse(data.readAt) - 400 * INSIGHT_DAY_MS).toISOString(), weightLbs: 195 }];
    const screen = await render(subject(weights));
    await expect.element(screen.getByText("No weight recorded in this range.", { exact: false })).toBeVisible();
    await screen.getByText("Inspect last recorded weight window", { exact: true }).click();
    await expect.element(screen.getByRole("img", { name: /Weight over the last 60 days/ })).toBeVisible();
    expect(screen.getByRole("img", { name: /Weight over the last 60 days/ }).element().getAttribute("aria-label")).toContain(new Date(weights.at(-1)!.recordedAt).toLocaleDateString());
    await expect.element(screen.getByText("Last recorded 60 days, ending", { exact: false })).toBeVisible();
    expect(screen.getByText(/^Down 5 lb since/).elements()).toHaveLength(1);
    await screen.getByRole("button", { name: "SHOW ACCOMPLISHMENT TIMELINE" }).click();
    await expect.poll(() => screen.getByRole("img", { name: /Weight over the last 60 days/ }).elements().length).toBe(0);
  });
  it.each([320, 360, 412])("ranges, measures, dates and keyboard point inspection remain usable at %ipx without writes", async (width) => {
    await page.viewport(width, 800);
    await startDay();
    const before = await db.events.toArray();
    const { data, weights } = fixture();
    vi.mocked(getBodyInsights).mockResolvedValue(data);
    const screen = await render(subject(weights));
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE" })).toBeVisible();
    await expect.element(screen.getByText("Existing goal: 180 lb.", { exact: false })).toBeVisible();
    await expect.element(screen.getByText("All-history milestones and the existing projection use weigh-ins through", { exact: false })).toBeVisible();
    expect(screen.getByRole("img", { name: /Weight:/ }).element().querySelector("path")?.getAttribute("d")).toContain("L");
    const slider = screen.getByRole("slider", { name: "Inspect recorded observation" });
    slider.element().focus();
    await userEvent.keyboard("{Home}");
    await expect.element(screen.getByRole("status")).toHaveTextContent("190.0 lb");
    await screen.getByRole("button", { name: "7 DAYS" }).click();
    await expect.element(screen.getByText("One observation is a record, not a trend.")).toBeVisible();
    await screen.getByRole("combobox", { name: "EXPLORE A MEASURE" }).selectOptions("calories");
    await expect.element(screen.getByText("−500 kcal average change", { exact: false })).toBeVisible();
    expect(screen.getByRole("img", { name: /Meal calories:/ }).element().querySelector("path")?.getAttribute("d")).not.toContain("L");
    screen.getByRole("slider", { name: "Inspect recorded observation" }).element().focus();
    await userEvent.keyboard("{Home}");
    await expect.element(screen.getByRole("status")).toHaveTextContent("0 kcal");
    await screen.getByRole("combobox", { name: "EXPLORE A MEASURE" }).selectOptions("sleep");
    await expect.element(screen.getByText("1 day with multiple main-sleep entries excluded", { exact: false })).toBeVisible();
    await screen.getByRole("combobox", { name: "EXPLORE A MEASURE" }).selectOptions("workouts");
    await expect.element(screen.getByText("1 finished workouts in 2 recorded lived days", { exact: false })).toBeVisible();
    await screen.getByText("Nutrition detail & coverage", { exact: true }).click();
    await expect.element(screen.getByText("Fiber is not recorded", { exact: false })).toBeVisible();
    await expect.element(screen.getByText("Co-recording is an observation", { exact: false })).toBeVisible();
    await screen.getByText("Inspect observations & calculation", { exact: true }).click();
    await expect.element(screen.getByText("Effective corrected entries", { exact: false })).toBeVisible();
    for (const name of ["7 DAYS", "28 DAYS", "90 DAYS"]) expect(screen.getByRole("button", { name }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(await db.events.toArray()).toEqual(before);
    // Changes are local exploration, not fresh persistence/network requests.
    expect(getBodyInsights).toHaveBeenCalledTimes(1);
  });

  it("clears old data through pending refresh, failure and pending retry; recovery is read-only", async () => {
    await startDay();
    const before = await db.events.toArray();
    const { data, weights } = fixture();
    let fail!: (error: Error) => void;
    let recover!: (data: BodyInsights) => void;
    vi.mocked(getBodyInsights).mockResolvedValueOnce(data)
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { recover = resolve; }));
    const screen = await render(subject(weights));
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE" })).toBeVisible();
    await screen.rerender(subject(weights, 1));
    await expect.element(screen.getByRole("status")).toHaveTextContent("Loading your recorded progress…");
    expect(screen.getByRole("combobox", { name: "EXPLORE A MEASURE" }).elements()).toHaveLength(0);
    fail(new Error("Read interrupted"));
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Your records are unchanged.");
    await screen.getByRole("button", { name: "RETRY PROGRESS" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Loading your recorded progress…");
    recover(data);
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE" })).toBeVisible();
    expect(await db.events.toArray()).toEqual(before);
  });

  it("missing data stays explicit and no-weigh-in progress still exposes training and other measures", async () => {
    const { data } = fixture();
    vi.mocked(getBodyInsights).mockResolvedValue(data);
    const screen = await render(subject([]));
    await expect.element(screen.getByText("No weight recorded in this range.", { exact: false })).toBeVisible();
    await expect.element(screen.getByText("No weigh-ins recorded. Your other progress is still available.")).toBeVisible();
    await screen.getByRole("combobox", { name: "EXPLORE A MEASURE" }).selectOptions("protein");
    await expect.element(screen.getByRole("slider", { name: "Inspect recorded observation" })).toBeVisible();
    expect(document.querySelector(".command-surface")).toBeNull();
  });

  it("full contrast/semantics and reduced motion remain valid with inspected records", async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const { data, weights } = fixture();
    vi.mocked(getBodyInsights).mockResolvedValue(data);
    const screen = await render(subject(weights));
    await expect.element(screen.getByRole("slider", { name: "Inspect recorded observation" })).toBeVisible();
    await screen.getByText("Inspect observations & calculation", { exact: true }).click();
    expect(document.getAnimations()).toHaveLength(0);
    expect((await axe.run(screen.container)).violations).toEqual([]);
  });
});
