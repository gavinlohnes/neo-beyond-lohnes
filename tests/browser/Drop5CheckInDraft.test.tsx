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

function pressed(): string[] {
  return [...document.querySelectorAll('[data-shift-clock-row="CHECK_IN"] button[aria-pressed="true"]')].map((b) => b.textContent ?? "");
}

function chip(label: string, n: number): HTMLButtonElement {
  const name = [...document.querySelectorAll("span")].find((s) => s.textContent === label)!;
  const row = name.parentElement!.nextElementSibling!;
  return [...row.querySelectorAll("button")].find((b) => b.textContent === String(n)) as HTMLButtonElement;
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

describe("check-in draft", () => {
  it("opens with the last answers and what's been logged since; CONFIRM records CONFIRMED", async () => {
    await seed();
    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "MANUAL CHECK-IN" }).click();

    await expect.element(screen.getByText(/^Draft: your check-in Wed 07:00\. Change anything that's different now\.$/)).toBeVisible();
    await expect.element(screen.getByText("Since then: main sleep 7 hr", { exact: true })).toBeVisible();
    await expect.poll(pressed).toEqual(["2", "4", "3", "2", "1"]);
    // Never auto-confirmed: nothing is written until the tap.
    expect(await db.checkIns.count()).toBe(1);

    await screen.getByRole("button", { name: "CONFIRM CHECK-IN" }).click();
    await expect.poll(() => db.checkIns.count()).toBe(2);
    expect(await latestCheckIn()).toMatchObject({ ...LAST, draft: "CONFIRMED" });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("changing any value turns it into SUBMIT and records ADJUSTED", async () => {
    await seed();
    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "MANUAL CHECK-IN" }).click();
    await expect.poll(pressed).toEqual(["2", "4", "3", "2", "1"]);

    chip("Soreness", 4).click();
    await expect.poll(pressed).toEqual(["2", "4", "3", "4", "1"]);
    await screen.getByRole("button", { name: "SUBMIT CHECK-IN" }).click();
    await expect.poll(() => db.checkIns.count()).toBe(2);
    expect(await latestCheckIn()).toMatchObject({ ...LAST, soreness: 4, draft: "ADJUSTED" });
  });

  it("START BLANK escapes the draft: an empty form, and no draft recorded", async () => {
    await seed();
    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "MANUAL CHECK-IN" }).click();
    await screen.getByRole("button", { name: "START BLANK" }).click();

    await expect.element(screen.getByText(/nothing here is filled in for you/)).toBeVisible();
    expect(pressed()).toEqual([]);
    for (const [label, n] of [["Energy", 4], ["Stress", 2], ["Mood", 4], ["Soreness", 1], ["Alcohol urge", 0]] as const) chip(label, n).click();
    await screen.getByRole("button", { name: "SUBMIT CHECK-IN" }).click();
    await expect.poll(() => db.checkIns.count()).toBe(2);
    const saved = await latestCheckIn();
    expect(saved).toMatchObject({ energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    expect(saved.draft).toBeUndefined();
  });

  it("offers no draft when the last check-in is more than 36 hours old", async () => {
    await seed();
    vi.setSystemTime(at(15, 20, 0));
    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "MANUAL CHECK-IN" }).click();
    await expect.element(screen.getByText(/nothing here is filled in for you/)).toBeVisible();
    expect(screen.getByText(/^Draft:/).elements()).toHaveLength(0);
  });
});
