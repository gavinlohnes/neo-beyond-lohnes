import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

/** MONTH-001 + ALFRED-004 #11: the month on one page, sleep owed, and "ask Alfred about this". */
beforeEach(async () => { await page.viewport(412, 915); });
afterEach(() => { cleanup(); });

describe("MONTH-001", () => {
  it("shows the month with sleep owed; a tapped day asks Alfred about it", async () => {
    const day = await startDay();
    await logSleep(day.id, 300, "PRIMARY");
    expect(await getSleepDebt()).toEqual({ owedMinutes: 120, days: 1 });
    const asked: string[] = [];
    const onAsk = (e: Event) => asked.push((e as CustomEvent<string>).detail);
    window.addEventListener(ASK_ALFRED_EVENT, onAsk);
    const screen = await render(<CaveMonthView />);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Sleep owed, last 1 logged day: 2h00 against 7 h a day.");
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
});
