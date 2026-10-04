import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { TransformationTimeline } from "../../src/ui/screens/body/TransformationTimeline";
import type { Timeline } from "../../src/application/timelineQueries";

/**
 * HUD-002 (review follow-up on BODY-TIMELINE-001): every filter chip hides
 * its own kind. Clean-day milestones need many days and the goal pin needs
 * two weeks of weigh-ins, so this feeds the component a prepared timeline
 * with all four kinds far enough apart to get their own markers.
 */
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const at = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
const timeline: Timeline = {
  windowStart: at(90),
  windowEnd: at(0),
  weighIns: [
    { recordedAt: at(80), weightLbs: 200 },
    { recordedAt: at(5), weightLbs: 188 },
  ],
  events: [
    { kind: "CLEAN_DAY_MILESTONE", date: at(70), label: "7 clean days" },
    { kind: "WEIGHT_MILESTONE", date: at(45), label: "Down 10 lb since Jul 16" },
    { kind: "PR", date: at(20), label: "Machine Chest Press: heaviest yet (145 lb)" },
    { kind: "GOAL", date: at(-40), label: "Goal 175 lb — at this pace, about Nov 13" },
  ],
  goalWeightLbs: 175,
};

vi.mock("../../src/application/timelineQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/timelineQueries")>();
  return { ...actual, getTimeline: vi.fn(async () => timeline) };
});

afterEach(() => {
  cleanup();
});

const labels = () => [...document.querySelectorAll(".timeline__marker")].map((m) => m.getAttribute("aria-label"));

describe("timeline filter chips", () => {
  it("each chip hides only its own kind, and turning it back on restores it", async () => {
    const screen = await render(<TransformationTimeline />);
    await expect.poll(labels).toHaveLength(4);
    for (const [chip, label] of [
      ["Clean days", "7 clean days"],
      ["Goal", "Goal 175 lb — at this pace, about Nov 13"],
      ["PRs", "Machine Chest Press: heaviest yet (145 lb)"],
      ["Weight", "Down 10 lb since Jul 16"],
    ] as const) {
      const button = screen.getByRole("button", { name: chip, exact: true });
      await button.click();
      await expect.poll(labels).toHaveLength(3);
      expect(labels()).not.toContain(label);
      expect(button.element().getAttribute("aria-pressed")).toBe("false");
      await button.click();
      await expect.poll(labels).toContain(label);
    }
  });

  it("the goal pins to the right edge and shows its line when tapped", async () => {
    const screen = await render(<TransformationTimeline />);
    const goal = screen.getByRole("button", { name: /^Goal 175 lb/ });
    await expect.element(goal).toBeVisible();
    const plot = document.querySelector(".timeline__plot")!.getBoundingClientRect();
    expect(goal.element().getBoundingClientRect().right).toBeLessThanOrEqual(plot.right + 0.5);
    await goal.click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Goal 175 lb — at this pace, about Nov 13");
  });
});
