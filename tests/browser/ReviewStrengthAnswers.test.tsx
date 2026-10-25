import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { db } from "../../src/persistence/db";
import { StrengthAnswers } from "../../src/ui/screens/review/StrengthAnswers";
import type { WorkoutSession } from "../../src/domain/common/types";

const now = new Date("2026-10-24T12:00:00.000Z");
const at = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); await page.viewport(320, 640); await db.open(); await db.delete(); await db.open(); });
afterEach(async () => { await cleanup(); db.close(); vi.useRealTimers(); });

describe("REVIEW-001 strength answers", () => {
  it("shows comparable lift, muscle and honest balance evidence at phone width", async () => {
    for (const [id, days, weight] of [["r1", 2, 110], ["r2", 12, 108], ["p1", 30, 100], ["p2", 40, 98]] as const) {
      await db.workoutSessions.put({ id, schemaVersion: 1, beyondDayId: `day-${id}`, templateId: "A", sessionType: "STANDARD", status: "COMPLETED", startedAt: at(days), endedAt: at(days) } as WorkoutSession);
      await db.performedSets.put({ id: `set-${id}`, beyondDayId: `day-${id}`, sessionId: id, exerciseId: "machine-chest-press", setNumber: 1, weight, reps: 10, skipped: false, recordedAt: at(days) } as never);
    }
    const screen = await render(<div className="whole-picture"><StrengthAnswers active /></div>);
    await expect.element(screen.getByText(/1 lifts improving/)).toBeVisible();
    await screen.getByText("How is each muscle trained?", { exact: true }).click();
    await expect.element(screen.getByText("Chest", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Push 0.5 · Pull 0.0/)).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
