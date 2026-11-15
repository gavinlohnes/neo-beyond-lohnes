import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { getRecoveryComparison } from "../../src/application/recoveryComparison";
import { RecoveryComparison } from "../../src/ui/screens/weekly/RecoveryComparison";
import "../../src/ui/styles/global.css";
vi.mock("../../src/application/recoveryComparison", () => ({ getRecoveryComparison: vi.fn() }));
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); });
const week = { from: new Date(2026, 10, 1, 16, 30).getTime(), to: new Date(2026, 10, 8, 16, 30).getTime(), sessions: 2, sets: 12, volume: 12000, sleep: { mean: 420, days: 5 }, resting: { mean: null, days: 0 } };
it("shows counts, missing evidence and no readiness judgement at phone width", async () => {
  await page.viewport(320, 850);
  vi.mocked(getRecoveryComparison).mockResolvedValue({ weeks: [week, { ...week, from: week.to, to: new Date(2026, 10, 15, 16, 30).getTime(), volume: null, sessions: 0, sets: 0 }], unusual: { sleep: null, resting: null, steps: null } });
  const screen = await render(<RecoveryComparison />);
  await expect.element(screen.getByRole("table")).toBeVisible();
  await expect.element(screen.getByText("No qualifying sets logged", { exact: true })).toBeVisible();
  expect(screen.container.textContent).toContain("5/7 days");
  expect(screen.container.scrollWidth).toBeLessThanOrEqual(320);
  expect((await axe.run(screen.container)).violations).toEqual([]);
});
it("failed reads expose retry without showing stale or empty evidence", async () => {
  vi.mocked(getRecoveryComparison).mockRejectedValueOnce(new Error("Read failed")).mockResolvedValue({ weeks: null, unusual: { sleep: null, resting: null, steps: null } });
  const screen = await render(<RecoveryComparison />);
  await screen.getByRole("button", { name: "RETRY COMPARISON" }).click();
  await expect.element(screen.getByText("Not enough finished day windows to compare yet.", { exact: true })).toBeVisible();
});

it("opens only on purpose inside the existing Weekly training section without writing", async () => {
  const { WeeklyCheckInScreen } = await import("../../src/ui/screens/weekly/WeeklyCheckInScreen");
  const { db } = await import("../../src/persistence/db");
  vi.mocked(getRecoveryComparison).mockResolvedValue({ weeks: [week, { ...week, from: week.to, to: new Date(2026, 10, 15, 16, 30).getTime() }], unusual: { sleep: null, resting: null, steps: null } });
  const before = await db.events.count();
  const screen = await render(<WeeklyCheckInScreen now={new Date(2026, 10, 15, 18)} />);
  await expect.element(screen.getByRole("table")).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "COMPARE TRAINING AND RECOVERY", exact: true }).click();
  await expect.element(screen.getByRole("table")).toBeVisible();
  expect(await db.events.count()).toBe(before);
  await screen.getByRole("button", { name: "HIDE TRAINING AND RECOVERY", exact: true }).click();
  await expect.element(screen.getByRole("table")).not.toBeInTheDocument();
});
