import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { EatingWindowSetup } from "../../src/ui/screens/body/EatingWindowSetup";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { getEatingWindowSettings, saveEatingWindowSettings } from "../../src/application/eatingWindow";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import "../../src/ui/styles/global.css";

/**
 * GRAYSON C4.8a (Gavin, 2026-11-23: "Approve C4.8a"): set up on BODY behind a private safety check, then a neutral
 * card on TODAY. Sat Nov 14 2026 is a Week A work night. VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(14, 16, 31));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  await startDay(at(14, 16, 30).toISOString());
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("setup", () => {
  it("any YES on the safety check points to a doctor and turns nothing on; all NO turns it on, keeping no answers", async () => {
    await page.viewport(360, 900);
    const screen = await render(<EatingWindowSetup active />);
    await screen.getByText(/EATING WINDOW · OFF/).click();
    await screen.getByRole("button", { name: "TURN ON" }).click();
    const yes = screen.getByRole("button", { name: "YES" });
    await yes.first().click();
    await expect.element(screen.getByText("Talk with your doctor before starting an eating window. Nothing has been turned on.")).toBeVisible();
    expect(await getEatingWindowSettings()).toBeNull();
    for (const b of screen.getByRole("button", { name: "NO" }).elements()) (b as HTMLButtonElement).click();
    await screen.getByRole("button", { name: "TURN ON" }).click();
    await expect.poll(async () => (await getEatingWindowSettings())?.enabled).toBe(true);
    const stored = JSON.stringify(await db.schedulePatterns.get("current"));
    expect(stored).not.toMatch(/diabetes|disorder|faint/i);
    expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) { await page.viewport(360, Math.ceil(document.documentElement.scrollHeight)); await page.screenshot({ path: `${SHOTS}/360-setup.png` }); }
  });
});

describe("TODAY card", () => {
  for (const width of [320, 360, 412]) {
    it(`${width} px: plan → START FAST → fast in progress with typical context → UNDO; END FAST opens the window`, async () => {
      await saveEatingWindowSettings({ enabled: true, eatingHours: 10, opensAt: { WORK: "14:00", RECOVERY: "14:00", OFF: "10:00" }, safetyCheckedAt: at(14, 16).toISOString() });
      await page.viewport(width, 900);
      vi.setSystemTime(at(15, 0, 5));
      localStorage.setItem("beyond.orientation.v1", "seen");
      const screen = await render(<TodayScreen onOpenLife={() => {}} />);
      const card = screen.getByRole("region", { name: "Eating window" });
      await expect.element(card.getByText("Today's plan: eat 14:00–00:00.")).toBeVisible();
      await card.getByRole("button", { name: "START FAST" }).click();
      await expect.element(card.getByText(/FAST IN PROGRESS/)).toBeVisible();
      await expect.element(card.getByText("Typical, not measured in you.")).toBeVisible();
      expect([...card.element().querySelectorAll("button")].some((b) => getComputedStyle(b).backgroundColor === "rgb(208, 20, 27)")).toBe(false);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      expect((await axe.run(card.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
      if (SHOTS) { await page.viewport(width, Math.ceil(document.documentElement.scrollHeight)); await new Promise((r) => setTimeout(r, 200)); await page.screenshot({ path: `${SHOTS}/${width}-fasting.png` }); await page.viewport(width, 900); }
      await card.getByRole("button", { name: "UNDO" }).click();
      await expect.element(card.getByRole("button", { name: "START FAST" })).toBeVisible();
      await card.getByRole("button", { name: "START FAST" }).click();
      await card.getByRole("button", { name: "END FAST" }).click();
      await expect.element(card.getByText(/^OPEN/)).toBeVisible();
    });
  }

  it("is absent until he turns it on", async () => {
    vi.setSystemTime(at(15, 0, 5));
    await render(<TodayScreen onOpenLife={() => {}} />);
    await new Promise((r) => setTimeout(r, 500));
    expect(document.querySelector("[aria-label='Eating window']")).toBeNull();
  });
});
