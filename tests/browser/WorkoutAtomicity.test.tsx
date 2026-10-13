/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";

/**
 * WORKOUT-ATOMICITY-001 (owner approval 2026-10-13, issue #221, option A),
 * against real Chromium IndexedDB rather than fake-indexeddb: a workout
 * command's row and event roll back together, and MORE's Diagnostic detail
 * reports split workout records read-only.
 */

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanup();
  await page.viewport(1280, 800);
});

describe("WORKOUT-ATOMICITY-001 in a real browser", () => {
  it("rolls back a set row and a session end when the event write fails in real IndexedDB", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    const eventsBefore = await db.events.count();

    vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("simulated storage failure"));
    await expect(logSet(day.id, session.id, "squat", 1, 135, 5)).rejects.toThrow("simulated storage failure");
    expect(await db.performedSets.count()).toBe(0);

    vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("simulated storage failure"));
    await expect(completeWorkout(day.id, session.id, "STANDARD", "COMPLETED")).rejects.toThrow("simulated storage failure");
    expect((await db.workoutSessions.get(session.id))?.status).toBe("ACTIVE");
    expect(await db.events.count()).toBe(eventsBefore);
  });

  it("Diagnostic detail reads 0 workout record mismatches on clean data", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "squat", 1, 135, 5);
    const screen = await render(<MoreScreen />);
    await screen.getByText("Diagnostic detail", { exact: true }).click();
    const label = screen.getByText("Record mismatches", { exact: true });
    await expect.element(label).toBeVisible();
    expect(label.element().parentElement?.textContent).toBe("Record mismatches0");
  });

  it.each([320, 360, 412])("lists a split record as plain read-only text at %ipx, writing nothing", async (width) => {
    await page.viewport(width, 800);
    const day = await startDay();
    await db.workoutSessions.add({
      id: "split-session",
      schemaVersion: 1,
      beyondDayId: day.id,
      templateId: "B",
      sessionType: "STANDARD",
      status: "COMPLETED",
      startedAt: "2026-10-01T10:00:00.000Z",
      endedAt: "2026-10-01T11:00:00.000Z",
    });
    const eventsBefore = await db.events.toArray();
    const sessionsBefore = await db.workoutSessions.toArray();

    const screen = await render(<MoreScreen />);
    const message = screen.getByText("Workout from 2026-10-01 is saved without its start event.", { exact: true });
    await expect.element(message).not.toBeVisible();
    await screen.getByText("Diagnostic detail", { exact: true }).click();
    const label = screen.getByText("Record mismatches", { exact: true });
    await expect.element(label).toBeVisible();
    expect(label.element().parentElement?.textContent).toBe("Record mismatches2");
    await expect.element(message).toBeVisible();
    await expect.element(screen.getByText("Workout from 2026-10-01 is saved as COMPLETED without a matching end event.", { exact: true })).toBeVisible();
    expect(message.element().tagName).toBe("P");
    expect(message.element().closest("button, a")).toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(screen.container)).violations).toEqual([]);

    expect(await db.events.toArray()).toEqual(eventsBefore);
    expect(await db.workoutSessions.toArray()).toEqual(sessionsBefore);
  });
});
