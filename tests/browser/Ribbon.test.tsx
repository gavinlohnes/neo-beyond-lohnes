import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";
import { endDay, logProtein, logSleep, setWorkContext, startDay } from "../../src/application/commands";
import { logUrge, saveQuitHabit } from "../../src/application/quitCommands";

/**
 * The Ribbon (2026-10-03): the last 28 lived days in the weekly check-in,
 * one column per day, rows only for facts that were logged. The clock (Date
 * only) is pinned; two lived days are recorded, Oct 1 and Oct 2 (16:30 → 16:30).
 */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);

function ribbonRows(): string[] {
  return [...document.querySelectorAll("[data-ribbon-row]")].map((el) => el.getAttribute("data-ribbon-row")!);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  await page.viewport(360, 800);
});

afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("Weekly check-in — the Ribbon (real browser)", () => {
  it("draws 28 days, only the rows with data, and says a tapped day in words", async () => {
    await saveQuitHabit({ name: "Drinking" });
    vi.setSystemTime(at(1, 16, 40));
    const first = await startDay();
    await setWorkContext(first.id, "WORK", "MANUAL");
    await logProtein(first.id, 182);
    await logUrge(first.id, "AFTER_SHIFT");
    vi.setSystemTime(at(2, 13, 0));
    await logSleep(first.id, 435, "PRIMARY");
    await endDay(first.id);

    vi.setSystemTime(at(2, 16, 40));
    const second = await startDay();
    await setWorkContext(second.id, "OFF", "MANUAL");
    await logProtein(second.id, 90);

    vi.setSystemTime(at(3, 10, 0));
    const screen = await render(<WeeklyCheckInScreen />);
    const section = screen.getByRole("region", { name: "LAST 28 DAYS" });
    await expect.element(section).toBeVisible();

    // 28 day buttons, one per lived day, oldest first; today is the last. (VIEWS-001's SHOW 12
    // WEEKS disclosure also sits in this section; it isn't a day.)
    await expect.poll(() => section.getByRole("button").elements().filter((b) => !/12 WEEKS/.test(b.textContent ?? "")).length).toBe(28);
    // Rows appear only for facts logged at least once: no lift, no clean day here.
    await expect.poll(ribbonRows).toEqual(["shift", "sleep", "protein", "urges"]);
    await expect.element(section.getByText("Tap a day to see it.", { exact: true })).toBeVisible();

    const oct1 = section.getByRole("button", { name: "Thu, Oct 1 · worked · slept 7 hr 15 min · protein 182 g · 1 urge", exact: true });
    await oct1.click();
    await expect.element(section.getByText("Thu, Oct 1 · worked · slept 7 hr 15 min · protein 182 g · 1 urge", { exact: true })).toBeVisible();
    expect(oct1.element().getAttribute("aria-pressed")).toBe("true");
    // Tapping again clears it.
    await oct1.click();
    await expect.element(section.getByText("Tap a day to see it.", { exact: true })).toBeVisible();

    // A day with no record is an empty column, said plainly.
    await expect.element(section.getByRole("button", { name: "Wed, Sep 30 · nothing logged", exact: true })).toBeInTheDocument();
    await expect.element(section.getByRole("button", { name: "Fri, Oct 2 · not working · protein 90 g", exact: true })).toBeInTheDocument();

    // Neutral: no red anywhere in the strip.
    const html = section.element().innerHTML;
    expect(html).not.toMatch(/--accent|--red|--danger/);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("says there's nothing to show when the last 28 days are empty", async () => {
    vi.setSystemTime(at(3, 10, 0));
    const screen = await render(<WeeklyCheckInScreen />);
    await expect
      .element(
        screen.getByRole("region", { name: "LAST 28 DAYS" }).getByText("Not enough data yet — nothing logged in the last 28 days.", { exact: true }),
      )
      .toBeVisible();
  });
});
