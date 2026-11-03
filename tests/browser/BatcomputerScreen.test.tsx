import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

let dayId: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 20));
  const { id: _id, createdAt: _created, updatedAt: _updated, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  const day = await startDay(); dayId = day.id;
  await submitCheckIn(dayId, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

async function openRotationCommand(screen: Awaited<ReturnType<typeof render>>) {
  await screen.getByRole("button", { name: "MORE", exact: true }).click();
  await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("batcomputer");
  await screen.getByRole("button", { name: "ROTATION COMMAND Whole-rotation desktop briefing", exact: true }).click();
}

describe("BATCOMPUTER-001 Rotation Command", () => {
  it("presents Engine authority, schedule truth and deliberate actions on a wide display", async () => {
    await page.viewport(1440, 1000);
    const screen = await render(<App />);
    await openRotationCommand(screen);
    await expect.element(screen.getByRole("heading", { name: "ROTATION COMMAND", exact: true })).toBeVisible();
    await expect.element(screen.getByText("BEYOND / ENGINE", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("region", { name: "ROTATION COMMAND", exact: true }).getByText("ALFRED / COACH", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "YOUR ROTATION", exact: true })).toBeVisible();
    await expect.element(screen.getByText("NO SCORE", { exact: true })).toBeVisible();
    for (const name of ["EXPLAIN", "DRAFT THE WEEK", "INSPECT SOURCES", "RETURN TO FIELD"]) await expect.element(screen.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(1440);
    const result = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(result.violations).toEqual([]);
    await screen.getByRole("button", { name: /INSPECT SOURCES/ }).click();
    await expect.element(screen.getByRole("heading", { name: "MORE // REVIEW", exact: true })).toBeVisible();
  });

  it("keeps FIELD compact on a phone and returns directly to TODAY", async () => {
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await openRotationCommand(screen);
    await expect.element(screen.getByRole("heading", { name: "Deep work has a bigger surface.", exact: true })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    await screen.getByRole("button", { name: "RETURN TO FIELD", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
  });

  it("keeps an actionable Engine status accessible while red remains structural", async () => {
    await submitCheckIn(dayId, { energy: 1, stress: 4, mood: 2, soreness: 3, alcoholUrge: 0 });
    await page.viewport(1440, 1000);
    const screen = await render(<App />);
    await openRotationCommand(screen);
    await expect.element(screen.getByRole("region", { name: "ROTATION COMMAND", exact: true }).getByText("STABILIZE", { exact: true })).toBeVisible();
    const result = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
