import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";
import { logBodyweight, startDay } from "../../src/application/commands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { logSet, startWorkout } from "../../src/application/trainCommands";

/** Drop 7 (owner approval 2026-10-01): weekly check-in screen and home-screen shortcuts. */

const originalUrl = window.location.href;

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", originalUrl);
});

function openWithShortcut(target: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("go", target);
  window.history.replaceState(null, "", url.toString());
}

describe("Weekly check-in (real browser)", () => {
  it("opens from MORE and, with nothing logged, says so instead of grading anything", async () => {
    const screen = await render(<MoreScreen />);
    await screen.getByRole("button", { name: "Open WEEKLY CHECK-IN" }).click();
    await expect.element(screen.getByText("MORE // WEEKLY CHECK-IN", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Not enough data yet — no weigh-ins this week.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("0 workouts", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Not enough data yet — no protein logged this week.", { exact: true })).toBeVisible();
    expect(screen.getByText(/missed|behind|failed|off track/i).elements()).toHaveLength(0);
  });

  it("shows the week's weight and quit-tracker facts", async () => {
    await saveQuitHabit({ name: "Drinking", dailyCostUsd: 12 });
    const day = await startDay();
    await logBodyweight(day.id, 190.4);
    const screen = await render(<WeeklyCheckInScreen />);
    await expect.element(screen.getByText("Avg 190.4 lb", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("0 of 7 days clean", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("$0 saved", { exact: true })).toBeVisible();
  });
});

describe("Home-screen shortcuts (real browser)", () => {
  it("?go=weight opens BODY with the bodyweight entry open, and clears the URL", async () => {
    openWithShortcut("weight");
    const screen = await render(<App />);
    await expect.element(screen.getByText("BODY // ESSENTIALS", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("spinbutton", { name: "Weight (lbs)" })).toBeVisible();
    expect(new URL(window.location.href).searchParams.has("go")).toBe(false);
  });

  it("?go=urge opens the quit tracker with its urge buttons", async () => {
    await saveQuitHabit({ name: "Drinking" });
    openWithShortcut("urge");
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "Log urge: Stress" })).toBeVisible();
  });

  it("a shortcut wins over workout continuity, and logs nothing by itself", async () => {
    const day = await startDay();
    const active = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, active.id, "machine-chest-press", 1, 135, 10);
    openWithShortcut("water");
    const screen = await render(<App />);
    await expect.element(screen.getByText("BODY // ESSENTIALS", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "+8 oz" })).toBeVisible();
    await expect.element(screen.getByText("0 oz", { exact: true }).first()).toBeVisible();
  });
});
