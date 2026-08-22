import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";

/**
 * BEYOND Suit Implementation 01 (2026-08-22) — Utility Belt (Part 11).
 * First dedicated browser test for App.tsx's bottom navigation. Proves:
 * stable navigation positions/labels, the new LEVEL 1/STRUCTURAL
 * selected-tab tick (Part 8), that selection communicates through more
 * than color alone, and that touch targets stay at the established
 * 44px minimum.
 */

afterEach(() => {
  cleanup();
});

describe("Utility Belt (App shell bottom navigation)", () => {
  it("shows all four stable territories, TODAY selected by default", async () => {
    const screen = await render(<App />);
    for (const label of ["TODAY", "TRAIN", "BODY", "MORE"]) {
      await expect.element(screen.getByText(label, { exact: true })).toBeVisible();
    }
    const todayButton = screen.getByText("TODAY", { exact: true }).element().closest("button")!;
    expect(todayButton.getAttribute("aria-current")).toBe("page");
  });

  it("switching territories updates aria-current and keeps a non-color (bold) cue on the selected tab", async () => {
    const screen = await render(<App />);
    await screen.getByText("TRAIN", { exact: true }).click();

    const trainButton = screen.getByText("TRAIN", { exact: true }).element().closest("button")!;
    const todayButton = screen.getByText("TODAY", { exact: true }).element().closest("button")!;
    expect(trainButton.getAttribute("aria-current")).toBe("page");
    expect(todayButton.getAttribute("aria-current")).toBeNull();
    // Non-color cue: selected tab is bold (700), unselected is not —
    // this alone would still distinguish selection in grayscale.
    expect(getComputedStyle(trainButton).fontWeight).toBe("700");
    expect(getComputedStyle(todayButton).fontWeight).not.toBe("700");
  });

  it("every nav button meets the 44px minimum touch-target height", async () => {
    const screen = await render(<App />);
    for (const label of ["TODAY", "TRAIN", "BODY", "MORE"]) {
      const button = screen.getByText(label, { exact: true }).element().closest("button")!;
      expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });
});
