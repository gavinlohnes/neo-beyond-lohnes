import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { endDay, logSleep, startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { db } from "../../src/persistence/db";
import type { StateCheckIn } from "../../src/domain/common/types";

/**
 * Drop 5 — check-in draft. Tue Oct 13 2026 is a Week A work night, Wed Oct
 * 14 a day off. The operator checked in Wed 07:00 after the shift and
 * logged 7 h of main sleep at 14:00; the day off starts at 16:30.
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m, 0, 0);
const LAST = { energy: 2, stress: 4, mood: 3, soreness: 2, alcoholUrge: 1 } as const;

async function seed() {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  vi.setSystemTime(at(13, 16, 30));
  const night = await startDay();
  vi.setSystemTime(at(14, 7, 0));
  await submitCheckIn(night.id, LAST);
  vi.setSystemTime(at(14, 14, 0));
  await logSleep(night.id, 420, "PRIMARY");
  vi.setSystemTime(at(14, 16, 30));
  await endDay(night.id);
  await startDay();
  vi.setSystemTime(at(14, 17, 0));
}

async function latestCheckIn(): Promise<StateCheckIn> {
  const all = (await db.checkIns.toArray()) as StateCheckIn[];
  return all.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).at(-1)!;
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  await page.viewport(360, 800);
});

afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("REDESIGN-001 — previous check-in is reference only", () => {
  async function open() {
    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "CHECK IN", exact: true }).click();
    return { screen, sheet: screen.getByRole("dialog", { name: "CHECK IN", exact: true }) };
  }
  it("starts blank despite a recent previous check-in and retains its source/since evidence on demand", async () => {
    await seed(); const { screen, sheet } = await open();
    expect(sheet.element().querySelectorAll('[aria-pressed=true]')).toHaveLength(0);
    await expect.element(sheet.getByRole("button", { name: "SUBMIT CHECK-IN" })).toBeDisabled();
    await screen.getByText("Previous check-in · reference", { exact: true }).click();
    await expect.element(sheet.getByText(/Your check-in Wed 07:00/i)).toBeVisible();
    await expect.element(sheet.getByText("Since then: main sleep 7 hr", { exact: true })).toBeVisible();
    expect(await db.checkIns.count()).toBe(1);
  });
  it("records explicit current answers without fabricating confirmation of an automatically applied draft", async () => {
    await seed(); const { sheet } = await open();
    for (const label of ["Energy", "Stress", "Mood", "Soreness", "Alcohol urge"]) await sheet.getByRole("group", { name: label, exact: true }).getByRole("button", { name: "3", exact: true }).click();
    await sheet.getByRole("button", { name: "SUBMIT CHECK-IN" }).click();
    await expect.poll(() => db.checkIns.count()).toBe(2);
    expect(await latestCheckIn()).toMatchObject({ energy: 3, stress: 3, mood: 3, soreness: 3, alcoholUrge: 3 });
    expect((await latestCheckIn()).draft).toBeUndefined();
    const [original] = await db.checkIns.orderBy("recordedAt").toArray(); expect(original).toMatchObject(LAST);
  });
  it("keeps a partial manual answer on dismissal and never fills the remaining answers from history", async () => {
    await seed(); const { screen, sheet } = await open();
    await sheet.getByRole("group", { name: "Energy", exact: true }).getByRole("button", { name: "5", exact: true }).click();
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click(); await screen.getByRole("button", { name: "CHECK IN", exact: true }).click();
    expect(sheet.element().querySelectorAll('[aria-pressed=true]')).toHaveLength(1);
    await expect.element(sheet.getByRole("button", { name: "SUBMIT CHECK-IN" })).toBeDisabled(); expect(await db.checkIns.count()).toBe(1);
  });
  it("does not offer stale previous answers older than 36 hours", async () => {
    await seed(); vi.setSystemTime(at(16, 10)); const { sheet } = await open();
    expect(sheet.element().querySelectorAll('[aria-pressed=true]')).toHaveLength(0);
    expect(sheet.getByText("Previous check-in · reference", { exact: true }).elements()).toHaveLength(0);
    expect(await db.checkIns.count()).toBe(1);
  });
});
