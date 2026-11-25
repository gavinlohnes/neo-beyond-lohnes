import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { ASK_ALFRED_EVENT } from "../../src/ui/components/AlfredSheet";
import { completeShiftDown, logBodyweight, markWorkEnded, startDay, startShiftDown, updateSchedulePattern } from "../../src/application/commands";
import { logManualMeal } from "../../src/application/nutritionCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * GRAYSON-CLOSE-GAPS-001: after SHIFT DOWN, the close's first line names what didn't get logged (meals outside the
 * shift, weigh-in), and one tap opens Delta with the words ready. Sat Nov 14 2026 is a night shift (as DayClose); his
 * last weigh-in was Wed Nov 11; his usual work-day meal time is 14:00 (his own, from Logging nudge). Invented data.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const BOTH = "No meals logged today outside your shift. No weigh-in since Nov 11.";
let dayId = "";

beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  localStorage.setItem("beyond.logNudge.v1", JSON.stringify({ enabled: true, delayMinutes: 45, edited: { WORK: [(14 * 60 + 1440 - 990) % 1440] } }));
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(11, 16, 31));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  const earlier = await startDay(at(11, 16, 30).toISOString());
  vi.setSystemTime(at(11, 17));
  await logBodyweight(earlier.id, 184.2);
  vi.setSystemTime(at(14, 16, 31));
  dayId = (await startDay(at(14, 16, 30).toISOString())).id;
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

async function shiftDown() {
  vi.setSystemTime(at(15, 6, 5));
  await markWorkEnded(dayId);
  vi.setSystemTime(at(15, 6, 30));
  const started = await startShiftDown(dayId, 10);
  vi.setSystemTime(at(15, 6, 40));
  await completeShiftDown(dayId, started);
  vi.setSystemTime(at(15, 6, 45));
}
const gapsLine = () => document.querySelector<HTMLButtonElement>(".today-close__gaps");

describe("GRAYSON-CLOSE-GAPS-001", () => {
  it("is not shown before SHIFT DOWN", async () => {
    vi.setSystemTime(at(15, 6, 20));
    await render(<TodayScreen onOpenLife={() => {}} />);
    await new Promise((r) => setTimeout(r, 400));
    expect(gapsLine()).toBeNull();
  });

  for (const width of [320, 360, 412]) {
    it(`${width} px: both gaps in one muted line at the top of the close; SAVE and SKIP stay on the first screen; axe clean`, async () => {
      await page.viewport(width, 800);
      await shiftDown();
      const screen = await render(<TodayScreen onOpenLife={() => {}} />);
      const close = screen.getByRole("region", { name: "Close the day" });
      await expect.element(close.getByRole("button", { name: `${BOTH} Tell Delta` })).toBeVisible();
      const line = gapsLine()!;
      expect(getComputedStyle(line).fontSize).toBe("16px");
      expect(line.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(getComputedStyle(line).color).not.toBe("rgb(208, 20, 27)");
      // At the top: before the prompts.
      expect(line.compareDocumentPosition(close.getByLabelText("What went well?").element()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      expect((await axe.run(close.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
      close.element().scrollIntoView({ block: "start" });
      const skip = close.getByRole("button", { name: "SKIP" }).element().getBoundingClientRect();
      expect(skip.bottom - close.element().getBoundingClientRect().top).toBeLessThanOrEqual(640);
      close.element().scrollIntoView({ block: "center" });
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-close-both-${width}.png`, element: close.element() as HTMLElement });
    });
  }

  it("one gap: a meal outside the shift clears meals; the tap then asks for the weight", async () => {
    vi.setSystemTime(at(14, 17));
    await logManualMeal(dayId, { name: "Chicken and rice", calories: 600, proteinG: 45, carbsG: 60, fatG: 14 });
    await page.viewport(360, 800);
    await shiftDown();
    const asked: string[] = [];
    window.addEventListener(ASK_ALFRED_EVENT, (e) => asked.push((e as CustomEvent<string>).detail));
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const close = screen.getByRole("region", { name: "Close the day" });
    await close.getByRole("button", { name: "No weigh-in since Nov 11. Tell Delta" }).click();
    expect(asked).toEqual(["My weight this morning was "]);
    close.element().scrollIntoView({ block: "center" });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-close-one-360.png`, element: close.element() as HTMLElement });
  });

  it("the tap opens Delta with \"I ate \" and sends nothing, by keyboard", async () => {
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-gaps");
    vi.spyOn(window, "fetch").mockRejectedValue(new TypeError("offline"));
    await page.viewport(360, 900);
    await shiftDown();
    const screen = await render(<App />);
    const close = screen.getByRole("region", { name: "Close the day" });
    const line = close.getByRole("button", { name: `${BOTH} Tell Delta` });
    await expect.element(line).toBeVisible();
    (line.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("dialog", { name: "ALFRED" }).getByRole("textbox", { name: "Message Alfred" })).toHaveValue("I ate ");
    await new Promise((r) => setTimeout(r, 300));
    expect(vi.mocked(window.fetch).mock.calls.some(([, i]) => /"(content|text)":"I ate/.test(String((i as RequestInit | undefined)?.body ?? "")))).toBe(false);
  });

  it("the chooser turns it off (and keeps it off); SKIP hides it with the close", async () => {
    await page.viewport(360, 900);
    await shiftDown();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const close = screen.getByRole("region", { name: "Close the day" });
    await expect.element(close.getByRole("button", { name: `${BOTH} Tell Delta` })).toBeVisible();
    await close.getByRole("button", { name: "CHANGE QUESTIONS" }).click();
    await expect.element(close.getByRole("checkbox", { name: "Tell me what's missing" })).toBeChecked();
    await expect.element(close.getByRole("spinbutton", { name: /Weigh-in gap, days/ })).toHaveValue(3);
    expect((await axe.run(close.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    close.element().scrollIntoView({ block: "center" });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-close-chooser-360.png`, element: close.element() as HTMLElement });
    await close.getByRole("checkbox", { name: "Tell me what's missing" }).click();
    await close.getByRole("button", { name: "DONE" }).click();
    await expect.poll(gapsLine).toBeNull();
    expect(JSON.parse(localStorage.getItem("beyond.close.gaps.v1")!)).toEqual({ enabled: false, weighGapDays: 3 });
    await close.getByRole("button", { name: "CHANGE QUESTIONS" }).click();
    await close.getByRole("checkbox", { name: "Tell me what's missing" }).click();
    await close.getByRole("button", { name: "DONE" }).click();
    await expect.poll(gapsLine).not.toBeNull();
    await close.getByRole("button", { name: "SKIP" }).click();
    await expect.poll(() => document.querySelector("[aria-label='Close the day']")).toBeNull();
    expect(gapsLine()).toBeNull();
  });
});
