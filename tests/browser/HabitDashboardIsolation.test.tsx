import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { MONTH_NOW, seedLivedMonth } from "./helpers/livedMonth";

// A full history read can be unavailable/slow while the current-day dashboard remains usable.
// Keep real current-day habit, Garmin and correction queries; hold only the unrelated history surface.
vi.mock("../../src/application/habitQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/habitQueries")>();
  return { ...actual, getHabitWorkspace: vi.fn(() => new Promise<Awaited<ReturnType<typeof actual.getHabitWorkspace>>>(() => {})) };
});
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it.each([0, 14])("keeps populated Garmin readings and freshness when full habit history is unavailable, offset %i hours", async (hours) => {
  await seedLivedMonth(); vi.setSystemTime(MONTH_NOW + hours * 3600_000);
  await page.viewport(360, 900);
  const screen = await render(<App />);
  await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
  await expect.poll(() => document.querySelector('[data-dash="steps"]')?.textContent).toMatch(/STEPSGARMIN(?: · OLD)?[\d,]+/);
  await expect.poll(() => document.querySelector('[data-dash="resting"]')?.textContent).toMatch(/GARMIN(?: · OLD)?\d+ bpm/);
  if (hours) await expect.poll(() => [...document.querySelectorAll(".bf-src--garmin")].map((e) => e.textContent)).toContain("GARMIN · OLD");
});
