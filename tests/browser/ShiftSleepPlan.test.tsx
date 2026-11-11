import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** BIG-IDEAS-001 item 3: the next shift's sleep plan in Week Ahead. SAVE adds one reminder; SKIP hides a card. */
beforeEach(async () => { await page.viewport(360, 800); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

it("shows sourced cards for the next shift; SAVE adds only a reminder and SKIP hides a card", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const before = { obligations: await db.obligations.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()), checkIns: await db.checkIns.count() };

  const screen = await render(<WeekAheadView now={now} />);
  const plan = screen.getByRole("region", { name: /^NEXT SHIFT SLEEP PLAN · Tue 18:00–06:00$/ });
  await expect.element(plan).toBeVisible();
  await expect.element(plan.getByText("A 1½–3 h nap between 14:00 and 17:00, before your 18:00 shift.")).toBeVisible();
  // The seeded rotation has no Garmin-timed sleep, so the cutoff counts from the shift's end.
  await expect.element(plan.getByText("Last caffeine by Wed 00:00.")).toBeVisible();
  await expect.element(plan.getByRole("link", { name: /^Drake et al\. 2013/ })).toHaveAttribute("href", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807");
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  await plan.getByRole("button", { name: "Save Caffeine cutoff as a reminder" }).click();
  await expect.element(plan.getByText("Saved as a reminder: Last caffeine by 00:00.")).toBeVisible();
  const saved = (await db.obligations.toArray()).filter((o) => o.title === "Last caffeine by 00:00");
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ plannedAt: "2026-10-28", status: "OPEN" });
  await expect.element(screen.getByText("Planned: Last caffeine by 00:00")).toBeVisible();

  await plan.getByRole("button", { name: "Skip Light" }).click();
  await expect.element(plan.getByText("Light", { exact: true })).not.toBeInTheDocument();
  expect({ obligations: await db.obligations.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()), checkIns: await db.checkIns.count() })
    .toEqual({ ...before, obligations: before.obligations + 1 });

  // SKIP holds for that shift on this device.
  await cleanup();
  const again = await render(<WeekAheadView now={now} />);
  await expect.element(again.getByText("Pre-shift nap")).toBeVisible();
  expect(again.container.querySelector('[data-plan-card="LIGHT"]')).toBeNull();
});
