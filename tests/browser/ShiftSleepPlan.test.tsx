import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { CaveRouteView } from "../../src/ui/screens/systems/CaveRoute";
import { startDay } from "../../src/application/commands";
import { getCaveRoute } from "../../src/application/caveRoute";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** CIRCADIAN-SPIKE-001: the next shift's cards in ROUTE. SAVE previews, then adds one plan item; SKIP hides a card. */
beforeEach(async () => { await page.viewport(360, 800); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

it("shows sourced cards below the route; SAVE previews then adds only a planned item, and SKIP hides a card", async () => {
  await seedRotation();
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  await startDay();
  const waypointsBefore = (await getCaveRoute())!.waypoints.map((w) => w.kind);
  const before = { obligations: await db.obligations.count(), recommendations: await db.recommendations.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()) };

  const screen = await render(<CaveRouteView />);
  const plan = screen.getByRole("region", { name: /^NEXT SHIFT · Tue 18:00–06:00$/ });
  await expect.element(plan.getByText("Shift-work guidance, not a decision. Not medical advice, and BEYOND's recommendation doesn't use it.")).toBeVisible();
  // The seeded rotation has no Garmin-timed sleep, so the cutoff counts from the shift's end.
  await expect.element(plan.getByText("No substantial caffeine after Wed 00:00.")).toBeVisible();
  await expect.element(plan.getByText("Pre-shift nap", { exact: true })).toBeVisible();
  await expect.element(plan.getByText("First sleep after the run")).toBeVisible();
  await expect.element(plan.getByRole("link", { name: /^Drake, Roehrs/ })).toHaveAttribute("href", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/");
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  // SAVE shows a preview first; nothing is written until CONFIRM.
  await plan.getByRole("button", { name: "Save Caffeine cutoff" }).click();
  const preview = plan.getByRole("group", { name: "Preview: Caffeine cutoff" });
  await expect.element(preview.getByText(/^Adds a plan item for Wed, Oct 28: “No caffeine after 00:00”\. It's planned, never due/)).toBeVisible();
  expect(await db.obligations.count()).toBe(before.obligations);
  await preview.getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(plan.getByText("Saved as a plan item: No caffeine after 00:00.")).toBeVisible();
  const saved = (await db.obligations.toArray()).filter((o) => o.title === "No caffeine after 00:00");
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ plannedAt: "2026-10-28", status: "OPEN" });
  expect(saved[0]!.dueAt).toBeUndefined();

  await plan.getByRole("button", { name: "Skip Light on the way home" }).click();
  expect(screen.container.querySelector('[data-plan-card="LIGHT"]')).toBeNull();
  expect({ obligations: await db.obligations.count(), recommendations: await db.recommendations.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()) })
    .toEqual({ ...before, obligations: before.obligations + 1 });
  // The cards are not waypoints: the route, and so TODAY's next three points, are unchanged.
  expect((await getCaveRoute())!.waypoints.map((w) => w.kind)).toEqual(waypointsBefore);

  await cleanup();
  const again = await render(<CaveRouteView />);
  await expect.element(again.getByText("Caffeine cutoff")).toBeVisible();
  expect(again.container.querySelector('[data-plan-card="LIGHT"]')).toBeNull();
});
