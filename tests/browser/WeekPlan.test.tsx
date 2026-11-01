import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";
import { createObligation } from "../../src/application/intentCommands";
import { ASK_ALFRED_EVENT, PLAN_MY_WEEK_ASK } from "../../src/ui/components/AlfredSheet";

/** WEEK-PLAN-001: Week Ahead shows what's planned and due each day, and asks Alfred to plan. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); });

it("lists planned and due commitments on their days and opens Alfred with the plan question", async () => {
  const now = new Date(2026, 10, 2, 12);
  await createObligation({ title: "Call the bank", plannedAt: "2026-11-03" });
  await createObligation({ title: "Pay the car", dueAt: "2026-11-05" });
  const asked: string[] = [];
  window.addEventListener(ASK_ALFRED_EVENT, (e) => asked.push((e as CustomEvent<string>).detail));
  const screen = await render(<WeekAheadView now={now} />);
  await expect.element(screen.getByText("Planned: Call the bank")).toBeVisible();
  await expect.element(screen.getByText("Due: Pay the car")).toBeVisible();
  expect(screen.container.querySelector('[data-week-ahead-day="2026-11-03"]')!.textContent).toContain("Planned: Call the bank");
  await screen.getByRole("button", { name: "PLAN MY WEEK WITH ALFRED" }).click();
  expect(asked).toEqual([PLAN_MY_WEEK_ASK]);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});
