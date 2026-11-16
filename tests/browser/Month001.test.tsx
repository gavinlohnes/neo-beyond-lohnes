import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { act } from "react";
import { App } from "../../src/app/App";
import { logSleep, startDay } from "../../src/application/commands";
import { getSleepDebt } from "../../src/application/monthQueries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { CaveMonthView } from "../../src/ui/screens/systems/CaveMonth";
import { ASK_ALFRED_EVENT, askAlfred } from "../../src/ui/components/AlfredSheet";
import { seedRotation } from "./helpers/rotation";

/** MONTH-001 + ALFRED-004 #11: the month on one page, sleep owed, and "ask Alfred about this". */
beforeEach(async () => { await page.viewport(412, 915); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("MONTH-001", () => {
  it("shows the month with sleep owed; a tapped day asks Alfred about it", async () => {
    const day = await startDay();
    await logSleep(day.id, 300, "PRIMARY");
    // SLEEP-DEBT-LEARNED-001: one night is not enough to know his usual sleep, so there is no owed figure (no 7 h fallback).
    expect(await getSleepDebt()).toMatchObject({ status: "LEARNING", owedMinutes: 0, days: 1, judgedDays: 0 });
    const asked: string[] = [];
    const onAsk = (e: Event) => asked.push((e as CustomEvent<string>).detail);
    window.addEventListener(ASK_ALFRED_EVENT, onAsk);
    const screen = await render(<CaveMonthView />);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Sleep owed: no figure yet while BEYOND learns your usual sleep: work days still learning (0 of 10 days), days off still learning (0 of 10 days).");
    // The lived day is dated by the local day it starts on (16:30 the day before, early in the morning).
    const [summary] = await getDaySummaries();
    const label = new Date(summary!.livedDayStart).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (new Date(summary!.livedDayStart).getMonth() !== new Date().getMonth()) await screen.getByRole("button", { name: "Previous month" }).click();
    await screen.getByRole("button", { name: label, exact: true }).click();
    await expect.element(screen.getByText("Sleep 5h00")).toBeVisible();
    expect((await axe.run(screen.container)).violations).toEqual([]);
    await screen.getByRole("button", { name: "ASK ALFRED ABOUT THIS DAY" }).click();
    expect(asked[0]).toMatch(new RegExp(`^Tell me about ${label}`));
    window.removeEventListener(ASK_ALFRED_EVENT, onAsk);
  });

  it("askAlfred opens Alfred anywhere with the question ready", async () => {
    await startDay();
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-key");
    const screen = await render(<App />);
    await expect.element(screen.getByRole("region", { name: "Day mode" })).toBeVisible();
    act(() => askAlfred("About my sleep: why so short?"));
    const sheet = screen.getByRole("dialog", { name: "ALFRED" });
    await expect.element(sheet.getByRole("textbox", { name: "Message Alfred" })).toHaveValue("About my sleep: why so short?");
  });

  it("SLEEP-DEBT-LEARNED-001: with eight weeks of history, sleep owed is measured against his own usual sleep per kind of day", async () => {
    await seedRotation();
    const now = new Date(2026, 9, 27, 12);
    vi.setSystemTime(now);
    const debt = await getSleepDebt(now);
    expect(debt.status).toBe("LEARNED");
    expect(debt.judgedDays).toBe(7);
    expect(debt.targets.WORK).toMatchObject({ kind: "LEARNED" });
    expect(debt.targets.OFF).toMatchObject({ kind: "LEARNED" });
    // Work nights and nights off have different targets, and neither is the fixed 7 hours.
    const work = debt.targets.WORK.kind === "LEARNED" ? debt.targets.WORK.minutes : 0;
    const off = debt.targets.OFF.kind === "LEARNED" ? debt.targets.OFF.minutes : 0;
    expect(work).toBeLessThan(off);
    expect([work, off]).not.toContain(420);
    const hm = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;
    const days = (k: "WORK" | "OFF") => (debt.targets[k] as { baselineDays: number }).baselineDays;
    const screen = await render(<CaveMonthView />);
    await expect.element(screen.getByRole("status")).toHaveTextContent(
      `Sleep owed, last 7 logged days: ${hm(debt.owedMinutes)} below your usual (low end: work days ${hm(work)} (from ${days("WORK")} days), days off ${hm(off)} (from ${days("OFF")} days)).`);
    expect((await axe.run(screen.container)).violations).toEqual([]);
  });
});
