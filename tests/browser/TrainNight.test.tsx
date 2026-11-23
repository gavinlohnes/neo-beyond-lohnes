import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import type { ShiftSleepPlan } from "../../src/application/shiftSleepPlan";

/**
 * C4.4 on screen: TRAIN shows the window from the plan's own numbers, and ROUTE shows "Protect sleep tonight" like
 * any other plan card. The rules themselves are covered in tests/integration/shiftSleepPlan.test.ts; here the plan is
 * stubbed so the screens can be checked at phone widths.
 */
const plan = vi.hoisted(() => ({ value: null as ShiftSleepPlan | null }));
vi.mock("../../src/application/shiftSleepPlan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/shiftSleepPlan")>();
  return { ...actual, getShiftSleepPlan: async () => plan.value };
});
const { TrainScreen } = await import("../../src/ui/screens/train/TrainScreen");
const { ShiftSleepPlanCards } = await import("../../src/ui/screens/systems/ShiftSleepPlanCards");

const iso = (h: number, m = 0) => new Date(2026, 9, 26, h, m).toISOString();
const base: ShiftSleepPlan = {
  shift: { date: "2026-10-26", start: iso(18), end: new Date(2026, 9, 27, 6).toISOString(), overnight: true, firstOfRun: true, lastOfRun: false },
  cards: [], windows: [], caffeine: { hours: 6, setBy: "DEFAULT" }, caffeineAt: new Date(2026, 9, 27, 1, 30).toISOString(),
  trainWindow: { start: iso(9), end: iso(16), wake: iso(8) },
};
afterEach(async () => { await cleanup(); localStorage.clear(); });

for (const width of [320, 360, 412]) {
  it(`${width} px: TRAIN shows the train window; ROUTE shows Protect sleep tonight`, async () => {
    await page.viewport(width, 900);
    plan.value = { ...base, cards: [{ kind: "TRAINING", title: "Protect sleep tonight", detail: "Your 13:00 session was one of your hardest: 6,000 lb, in the top third of your last 8. Keep your sleep window, 07:30–14:15.", basis: "Your workout records and your usual sleep (Garmin).", source: null, plan: { title: "Protect sleep after today's training", plannedAt: "2026-10-27" } }] };
    const train = await render(<TrainScreen />);
    await expect.element(train.getByText("Train window: 09:00–16:00 · 1 h after your usual wake (08:00), done 2 h before your 18:00 shift.")).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await cleanup();
    const route = await render(<ShiftSleepPlanCards />);
    await expect.element(route.getByText("Protect sleep tonight")).toBeVisible();
    await expect.element(route.getByText(/one of your hardest: 6,000 lb/)).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(route.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
}

it("no window, no line: TRAIN says nothing about a window it doesn't have", async () => {
  plan.value = { ...base, trainWindow: null };
  const train = await render(<TrainScreen />);
  await expect.element(train.getByText("Prepare your workout. You choose the session.")).toBeVisible();
  expect(document.querySelector("[data-train-window]")).toBeNull();
});

it("once the window has begun, it reads from now (review on #627)", async () => {
  plan.value = { ...base, trainWindow: { start: iso(11, 7), end: iso(16), wake: iso(8) } };
  const train = await render(<TrainScreen />);
  await expect.element(train.getByText("Train window: now–16:00, done 2 h before your 18:00 shift.")).toBeVisible();
});
