import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { RecoveryContractOffer } from "../../src/ui/screens/today/RecoveryContract";
import { endDay, logSleep, startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * LIFE-STATE-003: on RUN OVER (Fri Nov 20 2026, after Wed and Thu shifts) TODAY offers a post-run report from the
 * records and an optional recovery contract for the first full day off (Sat), written only on CONFIRM.
 */
beforeEach(async () => {
  await page.viewport(390, 844);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  for (const [d, sleep, energy] of [[18, 330, 3], [19, 360, null]] as const) {
    vi.setSystemTime(new Date(2026, 10, d, 16, 35));
    const day = await startDay();
    vi.setSystemTime(new Date(2026, 10, d, 16, 40)); await logSleep(day.id, sleep);
    if (energy) { vi.setSystemTime(new Date(2026, 10, d, 16, 45)); await submitCheckIn(day.id, { energy, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 }); }
    vi.setSystemTime(new Date(2026, 10, d + 1, 16, 25)); await endDay(day.id);
  }
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("the post-run report reads the run that just ended, only when opened", async () => {
  vi.setSystemTime(new Date(2026, 10, 20, 18));
  await startDay();
  const events = await db.events.count();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.element(screen.getByText("RUN OVER")).toBeVisible();
  // FIELD-AUTHORITY-001: the next card still leads; the report and contract sit below it.
  const next = document.querySelector("[aria-label='Next action']"), after = document.querySelector("[aria-label='After the run']");
  expect(!!next && !!after && !!(next.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  await screen.getByText("POST-RUN REPORT").click();
  for (const line of ["2 shifts, Wed, Nov 18 – Thu, Nov 19.", "Main sleep averaged 5.8 h (logged on 2 of 2 shifts).", "Check-in energy averaged 3.0 of 5 (1 of 2 shifts).", "No workouts recorded."]) {
    await expect.element(screen.getByText(line, { exact: true })).toBeVisible();
  }
  expect(await db.events.count()).toBe(events);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
});

it("the recovery contract is optional, chosen, previewed and written only on CONFIRM, for the first full day off", async () => {
  vi.setSystemTime(new Date(2026, 10, 20, 18));
  await startDay();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  const contract = screen.getByRole("region", { name: "Recovery contract" });
  await expect.element(contract.getByText("A light plan for Sat, your first full day off. Pick any, or none.")).toBeVisible();
  await contract.getByLabelText("Easy training or rest").click(); // leave this one out
  await contract.getByRole("button", { name: "REVIEW THE CONTRACT" }).click();
  const preview = contract.getByRole("group", { name: "Preview" });
  await expect.element(preview.getByText("Adds these 2 plan items for Sat. Your schedule and training programme don't change.")).toBeVisible();
  await preview.getByRole("button", { name: "CANCEL" }).click();
  expect(await db.obligations.count()).toBe(0);
  await contract.getByRole("button", { name: "REVIEW THE CONTRACT" }).click();
  await contract.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText("Recovery contract added for Sat: Sleep first, Keep the day light.")).toBeVisible();
  const items = (await db.obligations.toArray()).map((o) => [o.title, o.plannedAt]).sort();
  expect(items).toEqual([["Keep the day light", "2026-11-21"], ["Sleep first", "2026-11-21"]]);
  // Nothing about the schedule changed.
  expect((await db.schedulePatterns.toArray()).length).toBe(1);
});

it("isn't offered twice in the recovery lived day, even after midnight", async () => {
  vi.setSystemTime(new Date(2026, 10, 20, 20));
  await startDay();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await screen.getByRole("region", { name: "Recovery contract" }).getByRole("button", { name: "REVIEW THE CONTRACT" }).click();
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText(/^Recovery contract added for Sat: /)).toBeVisible();
  await cleanup();
  vi.setSystemTime(new Date(2026, 10, 21, 9)); // still Friday's lived day
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.element(page.getByText("Your recovery contract is in your plans for Sat. Change it in MORE → PLAN TODAY.")).toBeVisible();
  expect(page.getByRole("region", { name: "Recovery contract" }).elements()).toHaveLength(0);
  expect(await db.obligations.count()).toBe(3);
});

it("review of #496: after a partial failure it says what was saved, never 'Nothing changed'", async () => {
  let calls = 0, saved = 0;
  const screen = await render(<RecoveryContractOffer dayLabel="Sat" planned={false} busy={false}
    onSave={async () => { calls++; if (calls === 2) throw new Error("disk"); }} onSaved={() => { saved++; }} />);
  await screen.getByRole("button", { name: "REVIEW THE CONTRACT" }).click();
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText("Recovery contract added for Sat: Sleep first.")).toBeVisible();
  await expect.element(screen.getByText("2 couldn't be saved. Try again later from MORE → PLAN TODAY.")).toBeVisible();
  expect(screen.getByText("That couldn't be saved. Nothing changed.").elements()).toHaveLength(0);
  expect(saved).toBe(1);
});
