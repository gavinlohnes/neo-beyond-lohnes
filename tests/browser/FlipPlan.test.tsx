import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { CaveRouteView } from "../../src/ui/screens/systems/CaveRoute";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-FLIP-PLAN-001. Week B (from Mon Nov 16 2026) works Wed and Thu; Fri–Sun are off; Mon Nov 23 starts the next
 * run (as LifeState002). No Garmin sleep is seeded, so bedtimes are "your usual". Nights 18:00–06:00.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => {
  await page.viewport(360, 800);
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });
const flipLine = () => document.querySelector("[aria-label='Operating state'] [data-flip-line]");
const moment = () => document.querySelector("[aria-label='Operating state'] .today-life-state__moment")?.textContent ?? null;

describe("TODAY: one muted line under the moment", () => {
  for (const [day, label, starts] of [
    [19, "LAST SHIFT", "Flip back: up by 13:00, daylight 14:00–16:00, bed at your usual time."],
    [20, "RUN OVER", "Flip back: up by 13:00, daylight 14:00–16:00, bed at your usual time."],
    [22, "FLIP DAY", "Tonight stay up a couple of hours later than usual; nap before your 18:00 shift."],
  ] as const) {
    it(`Nov ${day} under ${label}`, async () => {
      vi.setSystemTime(new Date(2026, 10, day, 18));
      await startDay();
      const open = vi.fn();
      await render(<TodayScreen onOpenLife={() => {}} onOpenCave={open} />);
      await expect.poll(moment).toMatch(new RegExp(`^${label} `));
      await expect.poll(() => flipLine()?.textContent ?? "").toMatch(new RegExp(`^${starts.replace(/[().]/g, "\\$&")}`));
      const line = flipLine()!;
      expect(document.querySelector(".today-life-state__moment")!.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(getComputedStyle(line).fontSize).toBe("16px");
      expect(Math.round(line.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      expect(getComputedStyle(line).color).not.toBe("rgb(208, 20, 27)");
      for (const width of [320, 360, 412]) {
        await page.viewport(width, 800);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      }
      await page.viewport(360, 800);
      expect((await axe.run(document.querySelector("[aria-label='Operating state']")!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/today-${label.toLowerCase().replace(" ", "-")}-360.png`, element: document.querySelector("[aria-label='Operating state']") as HTMLElement });
      (line as HTMLElement).click();
      expect(open).toHaveBeenCalledWith("route");
      expect(sessionStorage.getItem("beyond.flipPlan.focus.v1")).toBe("1");
    });
  }
  it("#723 review: at 360 px the day's next action stays on the first screen under the long LAST SHIFT line", async () => {
    vi.setSystemTime(new Date(2026, 10, 19, 18));
    await startDay();
    await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
    await expect.poll(() => flipLine()?.textContent ?? "").toMatch(/^Flip back:/);
    // Measure once the band and the week strip have settled, against the same screen with the line skipped.
    await new Promise((r) => setTimeout(r, 1500));
    window.scrollTo(0, 0);
    const top = () => document.querySelector("[aria-label='Next action']")!.getBoundingClientRect().top;
    const withLine = top(), height = flipLine()!.getBoundingClientRect().height;
    expect(height).toBeLessThanOrEqual(2 * 16 * 1.4 + 10); // at most two lines at 360 px
    expect(withLine).toBeGreaterThan(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/today-last-shift-full-360.png` });
  });
  it("#723 review: SKIP in ROUTE hides the TODAY line too", async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 18));
    await startDay();
    localStorage.setItem("beyond.shiftSleepPlan.skip.2026-11-19.FLIP_BACK", "1");
    await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
    await expect.poll(moment).toMatch(/^RUN OVER /);
    await new Promise((r) => setTimeout(r, 300));
    expect(flipLine()).toBeNull();
  });
  it("not on a free day in the middle of the break", async () => {
    vi.setSystemTime(new Date(2026, 10, 21, 18));
    await startDay();
    await render(<TodayScreen onOpenLife={() => {}} onOpenCave={() => {}} />);
    await expect.poll(moment).toMatch(/^FREE DAYS /);
    await new Promise((r) => setTimeout(r, 300));
    expect(flipLine()).toBeNull();
  });
});

describe("ROUTE: the flip card", () => {
  it("shows after the shift ends, with its sources; CHANGE, SAVE and UNDO; SKIP hides it for that run", async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 9));
    await startDay();
    sessionStorage.setItem("beyond.flipPlan.focus.v1", "1");
    const screen = await render(<CaveRouteView />);
    const card = () => screen.getByRole("region", { name: "THE ROTATION FLIP" }).getByText("Flip back", { exact: true });
    await expect.element(card()).toBeVisible();
    await expect.poll(() => document.activeElement?.id).toBe("flip-plan-card");
    await expect.element(screen.getByText(/^Sleep soon after this shift and get up by 13:00\./).first()).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Timeshifter, How to timeshift" })).toBeVisible();
    await expect.element(screen.getByText(/Get up by 13:00 \(default\)\./)).toBeVisible();
    await screen.getByRole("button", { name: "Change the flip plan" }).click();
    await screen.getByRole("combobox", { name: /^Get up by, after the last night/ }).selectOptions("12:00");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/route-settings-360.png`, element: document.getElementById("flip-plan-card") as HTMLElement });
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Saved. The flip plan uses your settings.")).toBeVisible();
    await expect.element(screen.getByText(/^Sleep soon after this shift and get up by 12:00\./).first()).toBeVisible();
    await expect.element(screen.getByText(/Get up by 12:00 \(your setting\)\./)).toBeVisible();
    expect((await axe.run(document.getElementById("flip-plan-card")!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByText(/^Sleep soon after this shift and get up by 13:00\./).first()).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/route-card-360.png`, element: document.getElementById("flip-plan-card") as HTMLElement });
    await screen.getByRole("button", { name: "Skip Flip back" }).click();
    expect(screen.getByText("Flip back", { exact: true }).elements()).toHaveLength(0);
    expect(localStorage.getItem("beyond.shiftSleepPlan.skip.2026-11-19.FLIP_BACK")).toBe("1");
  });
  it("turned off, the card goes and its switch stays reachable to turn it back on", async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 9));
    await startDay();
    const screen = await render(<CaveRouteView />);
    await screen.getByRole("button", { name: "Change the flip plan" }).click();
    await screen.getByLabelText("Show flip plans").click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Flip plans are off.")).toBeVisible();
    expect(screen.getByText("Flip back", { exact: true }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "Change the flip plan" }).click();
    await screen.getByLabelText("Show flip plans").click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Flip back", { exact: true })).toBeVisible();
    expect(await db.obligations.count()).toBe(0);
  });
});
