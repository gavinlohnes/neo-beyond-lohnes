import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { CaveRouteView } from "../../src/ui/screens/systems/CaveRoute";
import { startDay } from "../../src/application/commands";
import { getSleepPlanSettings } from "../../src/application/sleepPlanSettings";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";
import type { CutoffSuggestion } from "../../src/application/cutoffProposal";

/**
 * C4.2a: the caffeine cut-off on ROUTE's CAFFEINE card. CHANGE sets his own number; DELTA's suggestion changes
 * nothing until APPROVE; UNDO puts it back; NOT NOW keeps it. The suggestion's arithmetic has its own tests
 * (tests/cutoffProposal.test.ts); here it is a fixed one so the card's flow is what's checked.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const mocks = vi.hoisted(() => ({ suggest: { on: false } }));
vi.mock("../../src/application/cutoffProposal", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../src/application/cutoffProposal")>();
  return {
    ...real,
    suggestCaffeineCutoff: (input: Parameters<typeof real.suggestCaffeineCutoff>[0]): CutoffSuggestion => {
      if (!mocks.suggest.on) return real.suggestCaffeineCutoff(input);
      if (input.currentHours >= 8) return { kind: "AT_MOST", currentHours: input.currentHours };
      if (input.declinedAt) return { kind: "QUIET", until: input.declinedAt };
      const evidence = [340, 335, 400, 445, 310, 350, 330, 365].map((m, i) => ({ livedDayStart: new Date(2026, 9, 26 - i, 16, 30).toISOString(), asleepMinutes: m }));
      return { kind: "PROPOSAL", hours: 8, currentHours: input.currentHours, nights: 8, shortNights: 7, medianMinutes: 345, confidence: "LOW", evidence };
    },
  };
});

beforeEach(async () => { await page.viewport(360, 800); localStorage.clear(); mocks.suggest.on = false; });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

async function routeAt() {
  await seedRotation();
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  await startDay();
  return render(<CaveRouteView />);
}

it("CHANGE sets his own cut-off, says where the number comes from, redraws the time, and UNDO puts it back", async () => {
  const screen = await routeAt();
  const card = screen.getByRole("region", { name: /^NEXT SHIFT/ });
  await expect.element(card.getByText(/^Cut-off: 6 h before sleep: the minimum a sleep study supports/)).toBeVisible();
  await expect.element(card.getByText("No substantial caffeine after Wed 00:00.")).toBeVisible();
  // No Garmin-timed sleep in the seed, so DELTA says nothing.
  expect(screen.container.querySelector("[data-cutoff-suggestion]")).toBeNull();
  const schedule = JSON.stringify((await db.schedulePatterns.get("current"))!.weeks);

  await card.getByRole("button", { name: "Change the caffeine cut-off" }).click();
  const editor = card.getByRole("group", { name: "Change the caffeine cut-off" });
  await editor.getByRole("button", { name: "One hour more" }).click();
  await editor.getByRole("button", { name: "One hour more" }).click();
  await expect.element(editor.getByText("8 h before sleep")).toBeVisible();
  expect(await getSleepPlanSettings()).toEqual({}); // nothing until SAVE
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/c4-2a-change.png`, element: document.querySelector("[data-plan-card='CAFFEINE']")! });
  await editor.getByRole("button", { name: "SAVE 8 H" }).click();
  await expect.element(card.getByText("Saved. No substantial caffeine for 8 h before sleep.")).toBeVisible();
  await expect.element(card.getByText("No substantial caffeine after Tue 22:00.")).toBeVisible();
  await expect.element(card.getByText(/^Cut-off: 8 h before sleep: you set it\./)).toBeVisible();
  expect((await getSleepPlanSettings()).caffeineCutoff).toMatchObject({ hours: 8, setBy: "OWNER" });
  expect(JSON.stringify((await db.schedulePatterns.get("current"))!.weeks)).toBe(schedule);

  await card.getByRole("button", { name: "UNDO" }).click();
  await expect.element(card.getByText("Undone. Your cut-off is back as it was.")).toBeVisible();
  await expect.element(card.getByText("No substantial caffeine after Wed 00:00.")).toBeVisible();
  expect(await getSleepPlanSettings()).toEqual({});
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("DELTA's suggestion shows its evidence and confidence, changes nothing until APPROVE, and NOT NOW keeps the number", async () => {
  mocks.suggest.on = true;
  const screen = await routeAt();
  const suggestion = screen.getByRole("group", { name: "DELTA's suggestion" });
  await expect.element(suggestion.getByText("DELTA SUGGESTS · caffeine cut-off 8 h before sleep (now 6 h)")).toBeVisible();
  await expect.element(suggestion.getByText(/^Of your last 8 sleeps after a shift \(Garmin\), 7 were under 7 h; a typical one was 5h 45m\./)).toBeVisible();
  await expect.element(suggestion.getByText(/^Confidence: low, from 8 nights\. BEYOND doesn't record caffeine/)).toBeVisible();
  await expect.element(suggestion.getByRole("link", { name: /^Watson et al\. 2015/ })).toHaveAttribute("href", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/");
  await suggestion.getByRole("button", { name: "SHOW 8 NIGHTS" }).click();
  await expect.element(suggestion.getByText("Mon, Oct 26 shift: 5h 40m (under 7 h)")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/c4-2a-delta-suggests.png`, element: document.querySelector("[data-plan-card='CAFFEINE']")! });
  expect(await getSleepPlanSettings()).toEqual({});
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  await suggestion.getByRole("button", { name: "APPROVE 8 H" }).click();
  const card = screen.getByRole("region", { name: /^NEXT SHIFT/ });
  await expect.element(card.getByText("Approved. No substantial caffeine for 8 h before sleep.")).toBeVisible();
  await expect.element(card.getByText(/^Cut-off: 8 h before sleep: DELTA suggested it and you approved\./)).toBeVisible();
  await expect.element(card.getByText(/^8 h \(DELTA's suggestion you approved\) before the shift ends/)).toBeVisible();
  expect((await getSleepPlanSettings()).caffeineCutoff).toMatchObject({ hours: 8, setBy: "DELTA" });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/c4-2a-approved.png`, element: document.querySelector("[data-plan-card='CAFFEINE']")! });
  await card.getByRole("button", { name: "UNDO" }).click();
  await expect.element(card.getByText("Undone. Your cut-off is back as it was.")).toBeVisible();
  expect(await getSleepPlanSettings()).toEqual({});

  // After UNDO the suggestion is back; NOT NOW keeps 6 h and quiets it.
  await screen.getByRole("group", { name: "DELTA's suggestion" }).getByRole("button", { name: "NOT NOW" }).click();
  await expect.element(card.getByText("Kept 6 h. DELTA won't suggest this again for two weeks.")).toBeVisible();
  const settings = await getSleepPlanSettings();
  expect(settings.caffeineCutoff).toBeUndefined();
  expect(settings.declinedAt).toBeDefined();
});
