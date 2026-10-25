import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { db } from "../../src/persistence/db";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { ReviewAnswers } from "../../src/ui/screens/review/ReviewAnswers";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-25T12:00:00.000Z"));
  await page.viewport(320, 700);
  await db.open(); await db.delete(); await db.open();
});
afterEach(async () => { await cleanup(); db.close(); vi.useRealTimers(); });

it("shows the operator's session target beside the canonical recorded weekly average", async () => {
  await updateNutritionTargets({ strengthSessionsTargetPerWeek: 3 });
  const screen = await render(<ReviewAnswers />);
  await screen.getByText("How often have I trained?", { exact: true }).click();
  await expect.element(screen.getByText("Recorded average: 0.0 sessions/week. Your target: 3/week. Your choice, not a recommendation.", { exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
});
