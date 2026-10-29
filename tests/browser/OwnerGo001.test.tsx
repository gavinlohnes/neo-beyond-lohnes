import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { markWorkStarted, setWorkContext, startDay } from "../../src/application/commands";

/** OWNER-GO-001 (Gavin, 2026-10-29: "Go"): the protected items from the field study. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

async function workDayAt(hour: number, minute: number) {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 16, 16, 40));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(2026, 9, 16, hour, minute));
  return day;
}

describe("STARTED WORK puts TODAY on shift", () => {
  it("before 18:00, STARTED WORK swaps PREP for ON SHIFT and the prep prompts leave", async () => {
    const day = await workDayAt(17, 40);
    let screen = await render(<App />);
    await expect.element(screen.getByText("READY FOR TONIGHT", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /^Mode PREP/ })).toBeVisible();
    await markWorkStarted(day.id);
    await cleanup();
    screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: /^Mode ON SHIFT, per schedule/ })).toBeVisible();
    expect(screen.getByText("READY FOR TONIGHT", { exact: true }).elements()).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/Pinned/);
  });
});

describe("check-in: SAME AS LAST, and what it changed", () => {
  it("one tap repeats the previous check-in and says what holds the answer", async () => {
    const { submitCheckIn, endDay } = await import("../../src/application/commands");
    const { db } = await import("../../src/persistence/db");
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 14, 16, 40));
    const first = await startDay();
    await submitCheckIn(first.id, { energy: 2, stress: 4, mood: 2, soreness: 1, alcoholUrge: 0 });
    vi.setSystemTime(new Date(2026, 9, 15, 16, 35)); await endDay(first.id);
    vi.setSystemTime(new Date(2026, 9, 15, 16, 40)); await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "CHECK IN", exact: true }).click();
    const sheet = screen.getByRole("dialog", { name: "CHECK IN", exact: true });
    await expect.element(sheet.getByText(/^Energy 2/)).toBeVisible();
    await sheet.getByRole("button", { name: "SAME AS LAST", exact: true }).click();
    await expect.poll(() => db.checkIns.count()).toBe(2);
    const latest = (await db.checkIns.toArray()).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).at(-1)!;
    expect(latest).toMatchObject({ energy: 2, stress: 4, mood: 2, soreness: 1, alcoholUrge: 0 });
    await expect.element(screen.getByRole("status").filter({ hasText: /^(Still|Now): / }).first()).toBeVisible();
  });
});
