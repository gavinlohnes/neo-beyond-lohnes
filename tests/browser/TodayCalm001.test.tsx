import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { TodayQuietSettings } from "../../src/ui/screens/more/TodayQuietSettings";
import { LogNudgeSettings } from "../../src/ui/screens/more/LogNudgeSettings";
import { completeShiftDown, logWater, markWorkEnded, startDay, startShiftDown, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { createRoutine } from "../../src/application/routineCommands";
import { startExperiment } from "../../src/application/tryExperiment";
import { DEFAULT_SCHEDULE_PATTERN, livedDayShiftWindow } from "../../src/engine/scheduledContext";

/**
 * GRAYSON-TODAY-CALM-001 (C9.6): right after SHIFT DOWN on Sun Nov 15 2026 06:45 (the night shift from LOG-CATCHUP-001's
 * fixture), three quiet lines are due: the logging nudge (his own usual 05:30 meal time, nothing logged), his
 * After-shift routine and an experiment. Two show, "1 MORE" holds the third; the catch-up comes before the close.
 * Invented data.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const USUAL = (5 * 60 + 30 + 1440 - 990) % 1440; // 05:30 as a lived-day minute (from 16:30)

let withExperiment = false;
async function fixture() {
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  // His usual times; the on/off switch he set in a test (if any) is kept.
  const enabled = JSON.parse(localStorage.getItem("beyond.logNudge.v1") ?? "{}").enabled !== false;
  localStorage.setItem("beyond.logNudge.v1", JSON.stringify({ enabled, delayMinutes: 45, edited: { WORK: [USUAL], RECOVERY: [USUAL], OFF: [USUAL] } }));
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  const pattern = { ...DEFAULT_SCHEDULE_PATTERN, ...schedule };
  const bowl = await createSavedMeal({ name: "Chicken bowl", calories: 650, proteinG: 45, carbsG: 60, fatG: 18 });
  const past: Date[] = [];
  for (let day = 13; day > 1 && past.length < 2; day--) {
    const start = at(day, 16, 30);
    if (livedDayShiftWindow(start, pattern)) past.unshift(start);
  }
  for (const start of past) {
    vi.setSystemTime(new Date(start.getTime() + 60_000));
    const id = (await startDay(start.toISOString())).id;
    const shift = livedDayShiftWindow(start, pattern)!;
    vi.setSystemTime(new Date(shift.end.getTime() + 3_600_000));
    await logMeal(id, bowl.id, 1, new Date(shift.start.getTime() + 4.5 * 3_600_000).toISOString());
    await logWater(id, 16, new Date(shift.start.getTime() + 2 * 3_600_000).toISOString());
  }
  vi.setSystemTime(at(14, 16, 31));
  const dayId = (await startDay(at(14, 16, 30).toISOString())).id;
  await createRoutine({ title: "Wind-down", moment: "AFTER_SHIFT", steps: ["Curtains"] });
  if (withExperiment) await startExperiment({ what: "No screens after 07:00", days: 7, scope: "ALL" });
  vi.setSystemTime(at(15, 6, 5));
  await markWorkEnded(dayId);
  vi.setSystemTime(at(15, 6, 30));
  const started = await startShiftDown(dayId, 10);
  vi.setSystemTime(at(15, 6, 40));
  await completeShiftDown(dayId, started);
  vi.setSystemTime(at(15, 6, 45));
}
beforeEach(() => {
  localStorage.clear();
  withExperiment = false;
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const q = (sel: string) => document.querySelector(sel);
const lineState = () => ({
  nudge: !!q('[aria-label="Logging nudge"][role="group"]'),
  routine: !!q('[aria-label="After shift routine"]'),
  experiment: !!q("[data-try-active]"),
});

async function today(width = 360) {
  await page.viewport(width, 900);
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => q('[aria-label="Shift catch-up"]')).not.toBeNull();
  await expect.poll(() => q(".today-quiet-lines")).not.toBeNull();
  await expect.poll(() => q('[aria-label="After shift routine"]') !== null || q(".today-quiet-more") !== null).toBe(true);
  return screen;
}
const shown = () => ({ drive: !!q(".today-drive-home"), ...lineState(), more: q(".today-quiet-more")?.textContent ?? null });
function fits(root: Element, width: number) {
  const seen = (el: HTMLElement) => el.getClientRects().length > 0;
  for (const b of [...root.querySelectorAll<HTMLElement>("button")].filter(seen)) expect(b.getBoundingClientRect().height, `${width} ${b.textContent}`).toBeGreaterThanOrEqual(44);
  for (const el of [...root.querySelectorAll<HTMLElement>("p, button, summary, span")].filter(seen)) if (el.textContent?.trim()) expect(parseFloat(getComputedStyle(el).fontSize), `${width} ${el.textContent}`).toBeGreaterThanOrEqual(16);
  expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
}
async function aa(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"], rules: { "color-contrast": { enabled: false } } });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}

describe("GRAYSON-TODAY-CALM-001 on TODAY", () => {
  for (const width of [320, 360, 412]) {
    it(`${width} px: two quiet lines and "1 MORE"; the tap shows the third; fits, axe clean`, async () => {
      await fixture();
      const screen = await today(width);
      await expect.poll(() => shown()).toEqual({ drive: true, nudge: true, routine: false, experiment: false, more: "1 MORE" });
      const block = q(".today-quiet-lines")!;
      fits(block, width);
      await aa(`${width} quiet lines`, block);
      if (SHOTS && width === 360) await page.screenshot({ path: `${SHOTS}/360-after-shift-quiet.png`, element: block as HTMLElement });
      await screen.getByRole("button", { name: "1 more quiet line" }).click();
      await expect.poll(() => q('[aria-label="After shift routine"]')).not.toBeNull();
      await expect.poll(() => shown()).toEqual({ drive: true, nudge: true, routine: true, experiment: false, more: null });
      expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
    });
  }

  it("the catch-up comes first; the close shows once catch-up is done (NOTHING ELSE counts as done)", async () => {
    await fixture();
    const screen = await today();
    expect(q('[aria-label="Close the day"]')).toBeNull();
    await screen.getByRole("region", { name: "Shift catch-up" }).getByRole("button", { name: "NOTHING ELSE" }).click();
    await expect.poll(() => q('[aria-label="Shift catch-up"]')).toBeNull();
    await expect.element(screen.getByRole("region", { name: "Close the day" })).toBeVisible();
  });

  it("with the after-shift rule off, the catch-up and the close show together, as before", async () => {
    await fixture();
    localStorage.setItem("beyond.todayQuiet.v1", JSON.stringify({ max: 2, order: [], off: [], oneAfterShift: false }));
    const screen = await today();
    await expect.element(screen.getByRole("region", { name: "Shift catch-up" })).toBeVisible();
    await expect.element(screen.getByRole("region", { name: "Close the day" })).toBeVisible();
  });

  it("opening \"N MORE\" is remembered for the rest of the lived day, and three at once shows all three", async () => {
    await fixture();
    const first = await today();
    await first.getByRole("button", { name: "1 more quiet line" }).click();
    await cleanup();
    await today();
    await expect.poll(() => q('[aria-label="After shift routine"]')).not.toBeNull();
    expect(q(".today-quiet-more")).toBeNull();
    await cleanup();
    localStorage.removeItem("beyond.todayQuiet.opened.v1");
    localStorage.setItem("beyond.todayQuiet.v1", JSON.stringify({ max: 3 }));
    await today();
    await expect.poll(() => q('[aria-label="After shift routine"]')).not.toBeNull();
    await expect.poll(() => shown()).toEqual({ drive: true, nudge: true, routine: true, experiment: false, more: null });
  });

  it("an experiment is a quiet line too: it leaves the mode header and waits its turn", async () => {
    withExperiment = true;
    await fixture();
    const screen = await today();
    await expect.poll(() => shown()).toEqual({ drive: true, nudge: true, routine: false, experiment: false, more: "2 MORE" });
    await screen.getByRole("button", { name: "2 more quiet lines" }).click();
    await expect.poll(() => q("[data-try-active]")).not.toBeNull();
    expect(q("[data-try-active]")!.closest(".today-quiet-lines")).not.toBeNull();
    expect(q("[data-try-active]")!.textContent).toBe("Trying: No screens after 07:00 · day 1 of 7");
  });

  it("keyboard only: Tab reaches \"1 MORE\", Enter opens it, and focus stays in the quiet lines", async () => {
    await fixture();
    await today();
    await expect.poll(() => q('[aria-label="Logging nudge"][role="group"]')).not.toBeNull();
    await expect.poll(() => q(".today-quiet-more")).not.toBeNull();
    const more = q(".today-quiet-more") as HTMLButtonElement;
    (q('[aria-label="Logging nudge"][role="group"] button:last-of-type') as HTMLElement).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(more);
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => q('[aria-label="After shift routine"]')).not.toBeNull();
    await expect.poll(() => document.activeElement === q(".today-quiet-lines")).toBe(true);
  });
});

describe("GRAYSON-TODAY-CALM-001 in MORE → Settings → TODAY", () => {
  it("changing the order in MORE changes TODAY", async () => {
    await page.viewport(360, 1600);
    const more = await render(<TodayQuietSettings />);
    for (let i = 0; i < 4; i += 1) await more.getByRole("button", { name: "Move Routine row up" }).click();
    expect(JSON.parse(localStorage.getItem("beyond.todayQuiet.v1")!).order.slice(0, 2)).toEqual(["ROUTINE", "DRIVE_HOME"]);
    fits(more.container, 360);
    await aa("MORE TODAY", more.container);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-more-today.png`, element: more.container });
    await cleanup();
    await fixture();
    await today();
    await expect.poll(() => q('[aria-label="After shift routine"]')).not.toBeNull();
    await expect.poll(() => shown()).toEqual({ drive: true, nudge: false, routine: true, experiment: false, more: "1 MORE" });
  });

  it("RESET ORDER puts the brief's order back, and a line turned off never shows", async () => {
    const more = await render(<TodayQuietSettings />);
    await more.getByRole("button", { name: "Move Routine row up" }).click();
    await more.getByRole("button", { name: "RESET ORDER" }).click();
    expect(JSON.parse(localStorage.getItem("beyond.todayQuiet.v1")!).order).toEqual(["DRIVE_HOME", "FIRST_AT_HOME", "LOG_NUDGE", "PHONE_ALERTS_BEHIND", "ROUTINE", "EXPERIMENT", "REVIEW", "HABIT_LADDER", "WORK_DUE"]);
    await more.getByRole("button", { name: "Show Drive home · hands-free" }).click();
    await cleanup();
    await fixture();
    await today();
    await expect.poll(() => q('[aria-label="After shift routine"]')).not.toBeNull();
    await expect.poll(() => shown()).toEqual({ drive: false, nudge: true, routine: true, experiment: false, more: null });
  });

  it("turning the logging nudge off in either place turns it off in both", async () => {
    const quiet = await render(<TodayQuietSettings />);
    await quiet.getByRole("button", { name: "Show Logging nudge (Tell Delta line)" }).click();
    await cleanup();
    const nudge = await render(<LogNudgeSettings />);
    await expect.element(nudge.getByRole("button", { name: "Logging nudge", exact: true })).toHaveAttribute("aria-pressed", "false");
    await nudge.getByRole("button", { name: "Logging nudge", exact: true }).click();
    await cleanup();
    const again = await render(<TodayQuietSettings />);
    await expect.element(again.getByRole("button", { name: "Show Logging nudge (Tell Delta line)" })).toHaveAttribute("aria-pressed", "true");
    await again.getByRole("button", { name: "Show Logging nudge (Tell Delta line)" }).click();
    await cleanup();
    await fixture();
    await today();
    await expect.poll(() => q('[aria-label="After shift routine"]')).not.toBeNull();
    await expect.poll(() => shown()).toEqual({ drive: true, nudge: false, routine: true, experiment: false, more: null });
  });
});
