import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { GoogleCalendarPanel } from "../../src/ui/screens/weekly/GoogleCalendarPanel";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";

beforeEach(async () => { localStorage.clear(); await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); localStorage.clear(); await page.viewport(1280, 800); });

describe("GCAL-SYNC-001", () => {
  it("explains an unconfigured build without starting OAuth", async () => {
    const screen = await render(<GoogleCalendarPanel onEventsChanged={() => {}} />);
    await screen.getByRole("button", { name: "CONNECT GOOGLE" }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("isn't configured in this build");
    expect(screen.getByRole("button", { name: "CONNECT GOOGLE" }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it("shows cached primary-calendar events as read-only Week Ahead context", async () => {
    localStorage.setItem("beyond.googleCalendar.events", JSON.stringify([{ id: "g1", title: "Synthetic appointment", start: "2026-11-04", end: "2026-11-05", allDay: true, calendar: "primary" }]));
    const screen = await render(<WeekAheadView now={new Date(2026, 10, 4, 12)} />);
    await expect.element(screen.getByText("Google · Synthetic appointment · all day", { exact: true })).toBeVisible();
    expect([...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Synthetic appointment"))).toBe(false);
  });
});

