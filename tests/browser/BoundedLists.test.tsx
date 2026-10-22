/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { HistoryScreen } from "../../src/ui/screens/history/HistoryScreen";
import { TrainingHistory } from "../../src/ui/screens/train/TrainingHistory";
import { logWater } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** UX-COHESION-001: long histories stay reachable but never render their whole archive at once. */
const H = 3600_000, DAY = 24 * H;
const firstDay = new Date(2026, 8, 22, 16, 30).getTime();
const now = new Date(2026, 9, 21, 22, 10).getTime();
let days: ReturnType<typeof syntheticGarminMonth>["days"];

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  days = syntheticGarminMonth(firstDay, 30, now).days;
  await db.beyondDays.bulkAdd(days);
  for (let i = 0; i < 30; i++) { vi.setSystemTime(firstDay + i * DAY + H); await logWater(days[i]!.id, 8); }
  vi.setSystemTime(now);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const cards = () => document.querySelectorAll("[id^='history-day-']").length;

describe("UX-COHESION-001 — bounded lists", () => {
  it("HISTORY shows fourteen days at a time and SHOW MORE reaches every day", async () => {
    const screen = await render(<HistoryScreen />);
    await expect.poll(cards).toBe(14);
    await screen.getByRole("button", { name: "SHOW MORE DAYS", exact: true }).click();
    await expect.poll(cards).toBe(28);
    await screen.getByRole("button", { name: "SHOW MORE DAYS", exact: true }).click();
    await expect.poll(cards).toBe(30);
    expect(screen.getByRole("button", { name: "SHOW MORE DAYS" }).elements()).toHaveLength(0);
  });

  it("HISTORY still opens straight to an old day beyond the first page", async () => {
    await render(<HistoryScreen focusDayId={days[2]!.id} />);
    await expect.poll(() => document.getElementById(`history-day-${days[2]!.id}`) !== null).toBe(true);
    expect(cards()).toBe(28); // the page grows to include the requested day, oldest first page intact
  });

  it("TRAIN history shows ten sessions at a time", async () => {
    for (let i = 0; i < 12; i++) {
      vi.setSystemTime(firstDay + i * DAY + 2 * H);
      const session = await startWorkout(days[i]!.id, "A", "STANDARD");
      await logSet(days[i]!.id, session.id, "machine-chest-press", 1, 100, 10);
      await completeWorkout(days[i]!.id, session.id, "STANDARD", "PARTIAL");
    }
    vi.setSystemTime(now);
    const screen = await render(<TrainingHistory active customTemplates={[]} onClose={() => {}} />);
    await expect.poll(() => document.querySelectorAll(".record-cards > li").length).toBe(10);
    await screen.getByRole("button", { name: "SHOW MORE SESSIONS", exact: true }).click();
    await expect.poll(() => document.querySelectorAll(".record-cards > li").length).toBe(12);
    await expect.element(screen.getByRole("button", { name: "BACK TO WORKOUT", exact: true })).toBeVisible();
  });
});
