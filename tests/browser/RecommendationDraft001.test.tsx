import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { TodayRecommendationDraft } from "../../src/ui/screens/today/TodayRecommendationDraft";
import { db } from "../../src/persistence/db";
import { seedShortSleepDraft } from "../helpers/shortSleepDraft";
import { getRecommendationDraft } from "../../src/application/recommendationDraftQueries";
import "../../src/ui/styles/fonts";
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
it("TODAY offers inspectable provisional guidance, saves nothing on open, and enters the existing check-in", async () => {
  await seedShortSleepDraft();
  const before = [await db.events.count(), await db.checkIns.count(), await db.recommendations.count()];
  await page.viewport(390, 900);
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByRole("region", { name: "Draft recommendation" })).toBeVisible();
  const el = document.querySelector<HTMLElement>('[aria-label="Draft recommendation"]')!;
  expect(el.textContent).toContain("5:10"); expect(el.textContent).toContain("4:50");
  expect(el.textContent).toContain("How you feel is still unknown");
  for (const width of [320, 390, 1024]) {
    await page.viewport(width, 900);
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);
    if (SHOTS && width === 390) await page.screenshot({ path: `${SHOTS}/recommendation-draft-phone.png`, element: el });
  }
  await screen.getByText("Why this starting point", { exact: true }).click();
  expect(el.textContent).toContain("No check-in answers, recommendation or plan have been saved");
  expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  await screen.getByRole("button", { name: "CHECK IN TO CONFIRM OR ADJUST" }).click();
  await expect.element(screen.getByRole("button", { name: "SUBMIT CHECK-IN", exact: true })).toBeVisible();
  expect([await db.events.count(), await db.checkIns.count(), await db.recommendations.count()]).toEqual(before);
  for (const [name, value] of [["Energy", "1"], ["Stress", "2"], ["Mood", "4"], ["Soreness", "0"], ["Alcohol urge", "0"]] as const) {
    await screen.getByRole("group", { name, exact: true }).getByRole("button", { name: value, exact: true }).click();
  }
  await screen.getByRole("button", { name: "SUBMIT CHECK-IN", exact: true }).click();
  await expect.poll(async () => (await db.recommendations.toArray()).at(-1)?.kind).toBe("STABILIZE");
  await expect.poll(() => document.querySelector('[aria-label="Draft recommendation"]')).toBeNull();

});
it("a failed read keeps manual operation reachable", async () => {
  const spy = vi.spyOn(db.beyondDays, "filter").mockImplementationOnce(() => { throw new Error("Read failed"); });
  try {
    const screen = await render(<TodayRecommendationDraft dayId="missing" now={Date.now()} refreshKey={0} busy={false} openCheckIn={() => {}} fallback={<button>CHECK IN MANUALLY</button>} />);
    await expect.element(screen.getByRole("status")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "CHECK IN MANUALLY" })).toBeVisible();
  } finally { spy.mockRestore(); }
});
it("normal or sparse sleep leaves the existing guidance intact", async () => {
  const id = await seedShortSleepDraft([420, 290]);
  expect(await getRecommendationDraft(id)).toBeNull();
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByRole("heading", { name: "Log when you want.", exact: true })).toBeVisible();
  expect(document.querySelector('[aria-label="Draft recommendation"]')).toBeNull();
});
