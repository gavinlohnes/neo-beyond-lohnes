import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { logBodyweight, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/** CLEANUP-003: walk-through findings 7, 9, 10 and 12. */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("CLEANUP-003", () => {
  it("BODY times have no seconds; the timeline's chips are outlined and replace the 60-day line (findings 7, 9)", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 200);
    await logBodyweight(day.id, 194);
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
    await expect.element(screen.getByText(/^Logged \d{1,2}:\d{2}\s?[AP]M$/)).toBeVisible();
    await expect.element(screen.getByText("Last 60 days")).toBeVisible();

    await screen.getByText("SHOW TIMELINE").click();
    const chip = screen.getByRole("button", { name: "PRs", exact: true });
    await expect.element(chip).toBeVisible();
    expect(getComputedStyle(chip.element()).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(screen.getByText("Last 60 days").elements()).toHaveLength(0);
    await expect.element(screen.getByText(/^Down 5 lb since/)).toBeVisible();
  });

  it("TRAIN stops asking 'Planning to train today?' once today's workout is done (finding 10)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const before = await render(<TrainScreen />);
    await expect.element(before.getByText("Planning to train today?")).toBeVisible();
    cleanup();

    const s = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, s.id, "machine-chest-press", 1, 100, 10);
    await completeWorkout(day.id, s.id, "STANDARD", "PARTIAL");
    const after = await render(<TrainScreen />);
    await expect.element(after.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    await expect.poll(() => after.getByText("Planning to train today?").elements().length).toBe(0);
  });

  it("MORE has one backup row with both EXPORT and SHARE, and no separate ARCHIVE row (finding 12)", async () => {
    const screen = await render(<MoreScreen />);
    await expect.element(screen.getByRole("button", { name: "EXPORT BACKUP" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "SHARE BACKUP" })).toBeVisible();
    expect([...document.querySelectorAll(".tool-label")].map((l) => l.textContent?.trim())).not.toContain("ARCHIVE");
  });
});
