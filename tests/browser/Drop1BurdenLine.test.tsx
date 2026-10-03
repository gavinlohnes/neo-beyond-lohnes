import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";
import { logProtein, logWater, startDay } from "../../src/application/commands";

/** Drop 1 (Burden Meter): one neutral, read-only line in the weekly check-in. */

afterEach(() => {
  cleanup();
});

describe("Weekly check-in — burden line (real browser)", () => {
  it("shows one neutral line with this week's entries per day and corrections", async () => {
    await page.viewport(360, 800);
    const day = await startDay();
    await logWater(day.id, 8);
    await logProtein(day.id, 30);
    const screen = await render(<WeeklyCheckInScreen />);

    const section = screen.getByRole("region", { name: "BURDEN" });
    await expect.element(section).toBeVisible();
    const line = section.getByText("Entries per day: 2 · corrections this week: 0", { exact: true });
    await expect.element(line).toBeVisible();
    // Neutral: the quiet metadata style, never a red accent, and nothing else in the section to act on.
    expect(line.element().className).toBe("meta");
    expect(section.getByRole("button").elements()).toHaveLength(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("says there's nothing to measure yet when the week has no days", async () => {
    const screen = await render(<WeeklyCheckInScreen />);
    await expect
      .element(screen.getByRole("region", { name: "BURDEN" }).getByText("Not enough data yet — no days this week.", { exact: true }))
      .toBeVisible();
  });

  it("Drop 6: the EXPENDITURE section says what it's waiting for, read-only", async () => {
    await page.viewport(360, 800);
    const screen = await render(<WeeklyCheckInScreen />);
    const section = screen.getByRole("region", { name: "EXPENDITURE" });
    await expect
      .element(
        section.getByText(
          "Not enough data yet — needs 14 days with meals logged (have 0) and 8 weigh-ins over 2 weeks (have 0) in the last 28 days.",
          { exact: true },
        ),
      )
      .toBeVisible();
    expect(section.getByRole("button").elements()).toHaveLength(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });
});
