import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { PlanTodayScreen } from "../../src/ui/screens/more/PlanTodayScreen";
import { HealthImportScreen } from "../../src/ui/screens/health/HealthImportScreen";
import { SystemsReadout } from "../../src/ui/screens/systems/SystemsReadout";
import { clockTime } from "../../src/ui/screens/systems/systemsCopy";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** FRICTION-001 slice 4: routine screens read as a person would say them. */
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("FRICTION-001 — plain dates and descriptions", () => {
  it("Plan today names the day, not an ISO date", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 22, 2, 30));
    const screen = await render(<PlanTodayScreen onOpen={() => {}} />);
    await expect.element(screen.getByText("Thu, Oct 22 · Your choices and recorded deadlines. Not a recommendation.", { exact: true })).toBeVisible();
    expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("Import health data says activity includes calories, not only sleep or steps", async () => {
    const screen = await render(<HealthImportScreen />);
    await expect.element(screen.getByText(/^Choose a file from BEYOND Health Bridge: sleep, or activity \(steps, heart rate and calories\)\./)).toBeVisible();
  });

  it("SYSTEMS dates a Garmin sleep by when you woke, not when it was imported", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const H = 3600_000, start = new Date(2026, 9, 20, 16, 30).getTime(), now = start + 34 * H;
    const { days, sleep } = syntheticGarminMonth(start, 2, now);
    await db.beyondDays.bulkAdd(days);
    vi.setSystemTime(now); await importSleepSnapshot(sleep);
    const woke = clockTime(sleep.records[0]!.endTime);
    const screen = await render(<SystemsReadout active />);
    await expect.element(screen.getByText(`Garmin · woke ${woke}`, { exact: true })).toBeVisible();
  });
});
