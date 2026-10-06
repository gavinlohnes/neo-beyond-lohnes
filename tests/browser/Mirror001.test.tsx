import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { logBodyweight, startDay } from "../../src/application/commands";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";

/** MIRROR-001: one closed row in Weekly; empty values said in words. */

afterEach(() => {
  cleanup();
});

describe("MIRROR-001", () => {
  it("is closed by default; opened, it compares now with 30 and 90 days ago and says when there's no data", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 205.1);
    const screen = await render(<WeeklyCheckInScreen />);
    await expect.element(screen.getByText("SHOW MIRROR")).toBeVisible();
    expect(document.querySelector("[data-mirror]")).toBeNull();
    await screen.getByText("SHOW MIRROR").click();
    await expect.element(screen.getByRole("columnheader", { name: "30 DAYS AGO" })).toBeVisible();
    const weight = screen.getByRole("row", { name: /Weight \(7-day avg\)/ });
    await expect.element(weight).toHaveTextContent("205.1 lb");
    await expect.element(weight).toHaveTextContent("not enough data yet");
    expect(screen.getByText(/missed|behind|failed|worse|better/i).elements()).toHaveLength(0);
  });
});
