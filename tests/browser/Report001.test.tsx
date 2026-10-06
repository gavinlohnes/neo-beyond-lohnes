import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { startDay } from "../../src/application/commands";
import { ReportReadyLine } from "../../src/ui/components/ReportReadyLine";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";

/**
 * REPORT-001: one TODAY line in its window only; the report from Weekly any time. Default
 * schedule: Mon Oct 12 / Tue 13 2026 work, Wed 14 off. Each case renders once (an unmount and
 * re-render inside one test leaves this browser runner's next renders uncommitted).
 */

afterEach(() => {
  cleanup();
});

const FIRST_DAY_OFF = new Date(2026, 9, 14, 9);

describe("REPORT-001", () => {
  it("AFTER ACTION READY on the first day off; OPEN shows the report", async () => {
    await startDay();
    const screen = await render(<ReportReadyLine now={FIRST_DAY_OFF} />);
    await expect.element(screen.getByText("AFTER ACTION READY")).toBeVisible();
    await screen.getByRole("button", { name: "Open the after action report" }).click();
    await expect.element(screen.getByText("This block vs last")).toBeVisible();
    expect(localStorage.getItem("beyond.reportSeen")).toBe("AFTER_ACTION:2026-10-14");
  });

  it("once opened that day, the line steps back on the next open of TODAY; it returns when the marker is gone", async () => {
    await startDay();
    function Harness() {
      const [n, setN] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setN((x) => x + 1)}>REOPEN TODAY</button>
          <ReportReadyLine key={n} now={FIRST_DAY_OFF} />
        </>
      );
    }
    const screen = await render(<Harness />);
    await screen.getByRole("button", { name: "Open the after action report" }).click();
    await expect.element(screen.getByText("This block vs last")).toBeVisible();
    await screen.getByRole("button", { name: "REOPEN TODAY" }).click();
    // A fresh TODAY that day: the line stays back…
    await expect.poll(() => screen.container.textContent).toBe("REOPEN TODAY");
    // …because of the marker: without it, the same fresh TODAY shows the line again.
    localStorage.removeItem("beyond.reportSeen");
    await screen.getByRole("button", { name: "REOPEN TODAY" }).click();
    await expect.element(screen.getByText("AFTER ACTION READY")).toBeVisible();
  });

  it("BRIEFING READY on a work night at 0300; gone by 1500 on that work day", async () => {
    function Harness() {
      const [now, setNow] = useState(() => new Date(2026, 9, 13, 3));
      return (
        <>
          <button type="button" onClick={() => setNow(new Date(2026, 9, 13, 15))}>LATER</button>
          <ReportReadyLine now={now} />
        </>
      );
    }
    const screen = await render(<Harness />);
    await expect.element(screen.getByText("BRIEFING READY")).toBeVisible();
    await screen.getByRole("button", { name: "LATER" }).click();
    await expect.poll(() => screen.container.textContent).toBe("LATER");
  });

  it("Weekly opens the report any time, closed by default", async () => {
    await startDay();
    const screen = await render(<WeeklyCheckInScreen />);
    await expect.element(screen.getByText("SHOW REPORT")).toBeVisible();
    expect(document.querySelector("[data-report]")).toBeNull();
    await screen.getByText("SHOW REPORT").click();
    // Whatever today's schedule holds, the report renders (items, or an honest "not enough data yet").
    await expect.poll(() => document.querySelector("[data-report]")?.textContent ?? "").toMatch(/This block vs last|Not enough data yet/);
  });
});

describe("REPORT-001 seen marker", () => {
  it("is per kind and per day", async () => {
    const { markSeen, seenKey, wasSeen } = await import("../../src/ui/components/ReportReadyLine");
    markSeen(seenKey("AFTER_ACTION", FIRST_DAY_OFF));
    expect(wasSeen(seenKey("AFTER_ACTION", FIRST_DAY_OFF))).toBe(true);
    expect(wasSeen(seenKey("AFTER_ACTION", new Date(2026, 9, 21, 9)))).toBe(false);
    expect(wasSeen(seenKey("BRIEFING", FIRST_DAY_OFF))).toBe(false);
  });
});
