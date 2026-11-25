import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import "../../src/ui/styles/fonts";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { completeShiftDown, markWorkEnded, startDay, startShiftDown, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { todaySettled } from "./helpers/todaySettled";

/**
 * GRAYSON-SHIFTDOWN-TAPS-001: "Before you go" inside SHIFT DOWN while it runs, and "First at home" on TODAY after it.
 * Sat Nov 14 2026 is a night shift (as CloseGaps); SHIFT DOWN starts Sunday 06:30.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0, s = 0) => new Date(2026, 10, d, h, m, s);
let dayId = "", started = "";
beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(14, 16, 31));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  dayId = (await startDay(at(14, 16, 30).toISOString())).id;
  vi.setSystemTime(at(15, 6, 5)); await markWorkEnded(dayId);
  vi.setSystemTime(at(15, 6, 30)); started = await startShiftDown(dayId, 10);
  vi.setSystemTime(at(15, 6, 31));
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); await page.viewport(1280, 800); });
const section = (screen: Awaited<ReturnType<typeof render>>) => screen.getByRole("region", { name: "BEFORE YOU GO" });

describe("GRAYSON-SHIFTDOWN-TAPS-001 in SHIFT DOWN", () => {
  for (const width of [320, 360, 412]) {
    it(`${width} px: three rows below COMPLETE, 44 px targets, no red, no overflow, axe clean`, async () => {
      await page.viewport(width, 800);
      const screen = await render(<TodayScreen onOpenLife={() => {}} />);
      const s = section(screen);
      await expect.element(s).toBeVisible();
      // The card fades in; measure and check contrast once it has.
      await Promise.all(document.getAnimations().map((x) => x.finished.catch(() => undefined)));
      const complete = screen.getByRole("button", { name: "COMPLETE SHIFT DOWN" }).element();
      expect(complete.compareDocumentPosition(s.element()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      for (const b of s.element().querySelectorAll("button, summary")) {
        expect(Math.round(b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
        expect(getComputedStyle(b).color).not.toBe("rgb(208, 20, 27)");
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      expect((await axe.run(s.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
      s.element().scrollIntoView({ block: "center" });
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/section-${width}.png`, element: s.element() as HTMLElement });
    });
  }

  it("PARK puts each item in Capture with the time it was parked", async () => {
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const s = section(screen);
    await s.getByRole("textbox", { name: "Anything unfinished? Park it." }).fill("Finish the Henderson report");
    await s.getByRole("button", { name: "PARK" }).click();
    await expect.element(s.getByText("Parked. It's in Capture.")).toBeVisible();
    vi.setSystemTime(at(15, 6, 32));
    await s.getByRole("textbox", { name: "Anything unfinished? Park it." }).fill("Call dispatch about Tuesday");
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => db.captureItems.count()).toBe(2);
    const items = (await db.captureItems.toArray()).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    expect(items.map((i) => [i.text, i.capturedAt])).toEqual([["Finish the Henderson report", at(15, 6, 31).toISOString()], ["Call dispatch about Tuesday", at(15, 6, 32).toISOString()]]);
  });

  it("BREATHE runs a ring with the words and a countdown; STOP ends it; nothing is recorded", async () => {
    await page.viewport(360, 800);
    const events = await db.events.count();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await section(screen).getByRole("button", { name: "BREATHE 1 MIN" }).click();
    const breath = screen.getByRole("group", { name: "Breathing" });
    await expect.element(breath.getByText("in", { exact: true })).toBeVisible();
    vi.setSystemTime(at(15, 6, 31, 4));
    await expect.element(breath.getByText("out, slowly")).toBeVisible();
    expect(document.querySelector<HTMLElement>(".shiftdown-bridge__ring")!.style.transform).toMatch(/^scale\(/);
    await expect.element(breath.getByText(/^0:5\d left/)).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/breath-360.png`, element: breath.element() as HTMLElement });
    await breath.getByRole("button", { name: "STOP" }).click();
    await expect.element(section(screen).getByRole("button", { name: "BREATHE 1 MIN" })).toBeVisible();
    vi.setSystemTime(at(15, 6, 31, 8));
    expect(await db.events.count()).toBe(events);
  });

  it("with reduced motion the words change in place and the ring doesn't move", async () => {
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((q: string) => q.includes("reduced-motion") ? ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList) : real(q));
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await section(screen).getByRole("button", { name: "BREATHE 1 MIN" }).click();
    vi.setSystemTime(at(15, 6, 31, 4));
    await expect.element(screen.getByText("out, slowly")).toBeVisible();
    expect(document.querySelector<HTMLElement>(".shiftdown-bridge__ring")!.style.transform).toBe("");
  });

  it("his settings: each row's switch hides only that row; the whole section can be turned off and back on", async () => {
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const s = section(screen);
    await s.getByRole("button", { name: "CHANGE" }).click();
    await s.getByLabelText("Breathe", { exact: true }).click();
    await s.getByRole("button", { name: "2 min" }).click();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-360.png`, element: s.element() as HTMLElement });
    await s.getByRole("button", { name: "DONE" }).click();
    expect(s.getByRole("button", { name: /^BREATHE/ }).elements()).toHaveLength(0);
    await expect.element(s.getByRole("textbox", { name: "Anything unfinished? Park it." })).toBeVisible();
    await expect.element(s.getByText("What's first at home?")).toBeVisible();
    await s.getByRole("button", { name: "CHANGE" }).click();
    await s.getByLabelText(`Show "Before you go"`).click();
    await s.getByRole("button", { name: "DONE" }).click();
    await expect.element(screen.getByText(/^Before you go is off\./)).toBeVisible();
    expect(JSON.parse(localStorage.getItem("beyond.shiftDownBridge.v1")!)).toMatchObject({ show: false, breathe: false, minutes: 2 });
  });
});

describe("GRAYSON-SHIFTDOWN-TAPS-001 First at home on TODAY", () => {
  it("pick Elle, complete SHIFT DOWN, see it on TODAY; CHANGE and CLEAR work; gone when the lived day ends", async () => {
    await page.viewport(360, 800);
    let screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await section(screen).getByRole("button", { name: "Elle" }).click();
    await expect.element(section(screen).getByRole("button", { name: "Elle" })).toHaveAttribute("aria-pressed", "true");
    await cleanup();
    vi.setSystemTime(at(15, 6, 41)); await completeShiftDown(dayId, started);
    vi.setSystemTime(at(15, 6, 45));
    screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await todaySettled();
    const line = () => screen.getByRole("group", { name: "Quiet lines" }).getByText("First at home: Elle.");
    await expect.element(line()).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/today-line-360.png`, element: document.querySelector("[data-first-at-home]") as HTMLElement });
    const box = document.querySelector("[data-first-at-home]")!;
    await screen.getByRole("button", { name: "CHANGE", exact: true }).click();
    await screen.getByRole("button", { name: "Food" }).click();
    await expect.element(screen.getByText("First at home: Food.")).toBeVisible();
    expect((await axe.run(box)).violations).toEqual([]);
    await screen.getByRole("button", { name: "CLEAR" }).click();
    await expect.element(screen.getByText(/^First at home:/)).not.toBeInTheDocument();
    // Picked again, then the lived day ends at 16:30: gone.
    localStorage.setItem("beyond.shiftDownHomeFirst.v1", JSON.stringify({ dayId, pick: "Sleep" }));
    await cleanup();
    vi.setSystemTime(at(15, 16, 31));
    screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await todaySettled();
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.getByText(/^First at home:/).elements()).toHaveLength(0);
  });
});
