import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { logBodyweight, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";

/**
 * BODY-TIMELINE-001: the transformation timeline inside BODYWEIGHT. Read
 * only; filters per event kind; markers are 44 px tap targets.
 */

afterEach(() => {
  cleanup();
});

async function openTimeline() {
  const screen = await render(<BodyScreen />);
  await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
  await screen.getByText("SHOW TIMELINE").click();
  return screen;
}

describe("BODY-TIMELINE-001 — transformation timeline", () => {
  it("with no weigh-ins it says how to start, with no empty chart", async () => {
    await startDay();
    const screen = await openTimeline();
    await expect.element(screen.getByText("Log a bodyweight to start your timeline.")).toBeVisible();
    expect(document.querySelector(".timeline__svg")).toBeNull();
  });

  it("pins a PR and a weight milestone; each filter hides its kind; tapping shows the line", async () => {
    await page.viewport(360, 800);
    const day = await startDay();
    for (const lbs of [200, 198, 194]) await logBodyweight(day.id, lbs);
    for (const [weight, reps] of [[135, 10], [145, 6]] as const) {
      const s = await startWorkout(day.id, "A", "STANDARD");
      await logSet(day.id, s.id, "machine-chest-press", 1, weight, reps);
      await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED");
    }
    const screen = await openTimeline();
    await expect.element(screen.getByRole("img", { name: /Weight over the last 90 days/ })).toBeVisible();

    // Everything logged today shares one marker; it carries both lines.
    const marker = screen.getByRole("button", { name: /Machine Chest Press: heaviest yet \(145 lb\)/ });
    await expect.element(marker).toBeVisible();
    expect(marker.element().getAttribute("aria-label")).toMatch(/Down 5 lb since/);
    const box = marker.element().getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await marker.click();
    await expect.element(screen.getByText(/· Machine Chest Press: heaviest yet \(145 lb\)/)).toBeVisible();

    await screen.getByRole("button", { name: "PRs", exact: true }).click();
    await expect.poll(() => document.querySelector(".timeline__marker")?.getAttribute("aria-label")).not.toMatch(/Chest Press/);
    await screen.getByRole("button", { name: "Weight", exact: true }).click();
    await expect.poll(() => document.querySelectorAll(".timeline__marker").length).toBe(0);
    await screen.getByRole("button", { name: "PRs", exact: true }).click();
    await expect.poll(() => document.querySelectorAll(".timeline__marker").length).toBe(1);

    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
  });
});
