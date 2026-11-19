import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { logProtein } from "../../src/application/commands";
import { seedLivedMonth, MONTH_FIRST_DAY, MONTH_NOW } from "./helpers/livedMonth";

/**
 * METRIC-CHANGE-001 (Gavin, 2026-11-19, "3C"): one plain "This week" sentence on the metric page, this lived week's
 * finished days against last week's, quiet until both have two recorded days. Synthetic data only: BODY-DASH-001's
 * month (now is Wed Oct 21, so this week began Mon Oct 19 = lived day 27).
 */
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
const text = (sel: string) => document.querySelector(`dialog[open] ${sel}`)?.textContent ?? "";

async function protein(days: readonly (readonly [number, number])[]) {
  const all = (await db.beyondDays.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const [i, g] of days) { vi.setSystemTime(MONTH_FIRST_DAY + i * 86_400_000 + 4 * 3_600_000); await logProtein(all[i]!.id, g); }
  vi.setSystemTime(MONTH_NOW);
}
async function openProtein() {
  await page.viewport(360, 800);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: /^Protein/ }).first().click();
  await expect.element(page.getByRole("dialog", { name: "PROTEIN", exact: true })).toBeVisible();
  await expect.poll(() => text("[data-md-hero]")).not.toBe("");
}

it("says this week against last week once both have two logged days", async () => {
  await seedLivedMonth();
  await protein([[20, 120], [24, 150], [27, 130], [28, 150]]); // last week 135 g, this week 140 g
  await openProtein();
  await expect.poll(() => text("[data-md-week]")).toBe("This week: 140 g a day, about the same as 135 g last week · 2 and 2 logged days.");
});

it("stays quiet with only one logged day this week", async () => {
  await seedLivedMonth();
  await protein([[20, 120], [24, 150], [27, 130]]);
  await openProtein();
  await expect.poll(() => text("[data-md-usual]")).not.toBe("");
  expect(document.querySelector("dialog[open] [data-md-week]")).toBeNull();
});
