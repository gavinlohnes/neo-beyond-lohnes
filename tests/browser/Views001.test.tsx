import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { RecordsList } from "../../src/ui/screens/train/RecordsList";
import { StrengthCurve } from "../../src/ui/screens/train/StrengthCurve";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";

/** VIEWS-001: views open from a tap; they never add rows. */

afterEach(() => {
  cleanup();
});

async function finished(weight: number) {
  const day = await startDay();
  const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, s.id, "machine-chest-press", 1, weight, 10);
  await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED", 45);
}

describe("VIEWS-001", () => {
  it("tapping a record opens that lift's strength curve with PRs marked; CLOSE goes back", async () => {
    await finished(100);
    await finished(110);
    await finished(105);
    const screen = await render(<RecordsList onClose={() => {}} />);
    await screen.getByRole("button", { name: /^Machine Chest Press: Heaviest: 110 lb × 10/ }).click();
    await expect.element(screen.getByRole("img", { name: /Strength curve/ })).toBeVisible();
    // Only 110 beat what came before (the RECORDS rule): one marked session.
    await expect.element(screen.getByText(/^100 lb \(.+\) → 105 lb \(.+\) over 3 sessions · 1 PR session$/)).toBeVisible();
    expect(document.querySelectorAll("[data-pr-marker]")).toHaveLength(1);
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await expect.element(screen.getByText("Records", { exact: true })).toBeVisible();
  });

  it("one session says so plainly, without a chart", async () => {
    await finished(100);
    const screen = await render(<StrengthCurve exerciseId="machine-chest-press" exerciseName="Machine Chest Press" onClose={() => {}} />);
    await expect.element(screen.getByText(/^One session so far: 100 lb/)).toBeVisible();
    expect(document.querySelector(".strength-curve")).toBeNull();
  });

  it("Weekly's 12-week grid is closed by default and adds no section", async () => {
    await finished(100);
    const screen = await render(<WeeklyCheckInScreen />);
    await expect.element(screen.getByText("SHOW 12 WEEKS")).toBeVisible();
    const sections = document.querySelectorAll("section.equipment-row").length;
    expect(document.querySelector("[data-heat-grid]")).toBeNull();
    await screen.getByText("SHOW 12 WEEKS").click();
    await expect.element(screen.getByRole("list", { name: "Training, last 12 weeks" })).toBeVisible();
    expect(screen.getByRole("listitem").elements()).toHaveLength(84);
    await expect.element(screen.getByText("1 strength · 0 recovery days in 12 weeks")).toBeVisible();
    expect(document.querySelectorAll("section.equipment-row").length).toBe(sections);
  });
});
