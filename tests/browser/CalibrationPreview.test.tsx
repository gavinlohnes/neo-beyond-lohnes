/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { CalibrationPreview } from "../../src/ui/screens/train/CalibrationPreview";

afterEach(async () => { await cleanup(); });

describe("GRAYSON-TRAIN-CALIBRATION-PREVIEW-001", () => {
  it("teaches a curated exercise, labels prior evidence and keeps feedback explicitly ephemeral", async () => {
    const close = vi.fn();
    const screen = await render(<CalibrationPreview
      exercise={{ exerciseId: "machine-chest-press", name: "Machine Chest Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 }}
      templateLabel="A"
      lastSet={{ weight: 80, reps: 10, recordedAt: "2026-11-18T18:00:00.000Z" }}
      personalCue="Shoulders down"
      onClose={close}
    />);
    await expect.element(screen.getByRole("dialog", { name: "Machine Chest Press" })).toBeVisible();
    await expect.element(screen.getByText(/without starting a workout/i)).toBeVisible();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    expect(document.querySelector(".calibration-preview__own")?.textContent).toContain("Shoulders down");
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await expect.element(screen.getByText(/80 lb × 10/)).toBeVisible();
    await expect.element(screen.getByText(/not today's prescribed load/i)).toBeVisible();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await screen.getByRole("button", { name: "VERY LIGHT" }).click();
    await expect.element(screen.getByText(/Closing discards this example response/i)).toBeVisible();
    await screen.getByRole("button", { name: "RETURN TO TRAIN" }).click();
    expect(close).toHaveBeenCalledOnce();
  });

  it("uses honest generic guidance for an uncurated custom exercise and exposes a read failure", async () => {
    const screen = await render(<CalibrationPreview
      exercise={{ exerciseId: "custom-1", name: "My Cable Press", sets: 2, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 }}
      templateLabel="CUSTOM"
      readError="Storage unavailable."
      onClose={() => {}}
    />);
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await expect.element(screen.getByText("Current programme exercise", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Storage unavailable.");
    await expect.element(screen.getByRole("alert")).toHaveTextContent("The preview will not invent a starting load.");
  });
});
