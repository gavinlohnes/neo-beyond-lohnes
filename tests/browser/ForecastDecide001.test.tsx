import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** FORECAST-DECIDE-001: the forecast's low day, sleep owed and best day each lead to an existing path, on CONFIRM. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("offers a lighter low day, recovery sleep on the next day off and a plan for the best day; writes only on CONFIRM", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const schedule = JSON.stringify(await db.schedulePatterns.toArray());
  const opened: string[] = []; let plans = 0;
  const screen = await render(<WeekAheadView now={now} onOpenPlanItem={(id) => opened.push(id)} onOpenPlans={() => { plans++; }} />);
  const actions = screen.getByRole("region", { name: "What you can do with this forecast" });
  await expect.element(actions.getByText("Sun looks like the low point. You could keep it light.")).toBeVisible();

  await actions.getByRole("button", { name: "PLAN A LIGHTER SUN" }).click();
  const preview = actions.getByRole("group", { name: "Preview" });
  await expect.element(preview.getByText("Adds this plan item for Sun. Your schedule doesn't change.")).toBeVisible();
  expect(await db.obligations.count()).toBe(0);
  await preview.getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(actions.getByText("Added plan item for Sun: Keep Sun light.")).toBeVisible();
  const [light] = await db.obligations.toArray();
  expect([light!.title, light!.plannedAt]).toEqual(["Keep Sun light", "2026-11-01"]);
  // It shows under Sunday, and the low day now offers to move it.
  await expect.element(screen.getByText("Planned: Keep Sun light")).toBeVisible();
  await actions.getByRole("button", { name: "MOVE “Keep Sun light”" }).click();
  expect(opened).toEqual([light!.id]);

  await expect.element(actions.getByText(/^Sleep owed is about \d+ h \d{2} m\. Wed is your next day off\.$/)).toBeVisible();
  await actions.getByRole("button", { name: "PLAN RECOVERY SLEEP ON WED" }).click();
  await actions.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.poll(async () => (await db.obligations.toArray()).map((o) => [o.title, o.plannedAt]).sort()).toEqual([["Keep Sun light", "2026-11-01"], ["Recovery sleep", "2026-10-28"]]);

  await actions.getByRole("button", { name: "CHOOSE A PLAN FOR WED" }).click();
  expect(plans).toBe(1);
  expect(JSON.stringify(await db.schedulePatterns.toArray())).toBe(schedule);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("CANCEL writes nothing, and without a way to open plans the best-day link is left out", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const screen = await render(<WeekAheadView now={now} />);
  const actions = screen.getByRole("region", { name: "What you can do with this forecast" });
  await actions.getByRole("button", { name: "PLAN A LIGHTER SUN" }).click();
  await actions.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CANCEL" }).click();
  expect(await db.obligations.count()).toBe(0);
  // Without onOpenPlans the best-day link is left out.
  expect(actions.getByRole("button", { name: /^CHOOSE A PLAN FOR/ }).elements()).toHaveLength(0);
});
