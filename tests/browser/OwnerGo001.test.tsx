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
