import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";

afterEach(() => {
  cleanup();
});

describe("WEEKAHEAD-001", () => {
  it.each([320, 360])("opens one read-only seven-day row without overflow at %ipx", async (width) => {
    await page.viewport(width, 800);
    const screen = await render(<WeeklyCheckInScreen now={new Date(2026, 9, 5, 9)} />);

    const toggle = screen.getByText("SHOW WEEK AHEAD", { exact: true });
    await expect.element(toggle).toBeVisible();
    expect(document.querySelector("[data-week-ahead]")).toBeNull();
    expect(toggle.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);

    await toggle.click();
    await expect.poll(() => document.querySelectorAll("[data-week-ahead-day]").length).toBe(7);
    await expect.element(screen.getByText("Suggestions only. Move or skip anything.", { exact: true })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(screen.getByText(/missed|failed|behind|penalty|streak/i).elements()).toHaveLength(0);
  });
});
