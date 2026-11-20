import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { completeShiftDown, markWorkEnded, startDay, startShiftDown, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON C1.3 + C1.4 (Gavin, 2026-11-20): the close follows SHIFT DOWN, his getting-home ritual, never END DAY.
 * Sat Nov 14 2026 is night 2 of 3; he shifts down at home around 06:30 Sunday.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots for the PR.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
let dayId = "";

beforeEach(async () => {
  localStorage.removeItem("beyond.close.done.v1");
  localStorage.removeItem("beyond.close.prompts.v1");
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(14, 16, 31));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  dayId = (await startDay(at(14, 16, 30).toISOString())).id;
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

async function shiftDown() {
  vi.setSystemTime(at(15, 6, 5));
  await markWorkEnded(dayId);
  vi.setSystemTime(at(15, 6, 30));
  const started = await startShiftDown(dayId, 10);
  vi.setSystemTime(at(15, 6, 40));
  await completeShiftDown(dayId, started);
  vi.setSystemTime(at(15, 6, 45));
}

it("is not offered before SHIFT DOWN", async () => {
  vi.setSystemTime(at(15, 6, 20));
  await render(<TodayScreen onOpenLife={() => {}} />);
  await new Promise((r) => setTimeout(r, 400));
  expect(document.querySelector("[aria-label='Close the day']")).toBeNull();
});

for (const width of [320, 360, 412]) {
  it(`${width} px: after SHIFT DOWN it shows what's next and saves two answers to the Daily Note`, async () => {
    await page.viewport(width, 900);
    await shiftDown();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const close = screen.getByRole("region", { name: "Close the day" });
    await expect.element(close.getByText("Next: tonight's shift is the last of the run.")).toBeVisible();
    // SHIFT DOWN is done, so it isn't offered again.
    expect(screen.getByRole("button", { name: "START SHIFT DOWN" }).elements()).toHaveLength(0);
    // No red: the close never outranks the day's real next step (FIELD-AUTHORITY-001).
    expect([...close.element().querySelectorAll("button")].some((b) => getComputedStyle(b).backgroundColor === "rgb(208, 20, 27)")).toBe(false);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(close.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) { await page.viewport(width, Math.ceil(document.documentElement.scrollHeight)); await new Promise((r) => setTimeout(r, 250)); await page.screenshot({ path: `${SHOTS}/${width}-close-today.png` }); await page.viewport(width, 900); }
    await close.getByLabelText("What went well?").fill("Calm night. Home safe.");
    await close.getByLabelText("Anything Delta should learn?").fill("Short sleeps hit harder on night 3.");
    await close.getByRole("button", { name: "SAVE TO NOTE" }).click();
    await expect.poll(async () => (await db.dailyNotes.get(dayId))?.text).toBe(
      "#close Sat, Nov 14\nQ: What went well?\nA: Calm night. Home safe.\nQ: Anything Delta should learn?\nA: Short sleeps hit harder on night 3.");
    await expect.poll(() => document.querySelector("[aria-label='Close the day']")).toBeNull();
  });
}

it("SKIP is one tap and writes nothing", async () => {
  await shiftDown();
  const events = await db.events.count();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await screen.getByRole("region", { name: "Close the day" }).getByRole("button", { name: "SKIP" }).click();
  await expect.poll(() => document.querySelector("[aria-label='Close the day']")).toBeNull();
  expect(await db.events.count()).toBe(events);
  expect(await db.dailyNotes.get(dayId)).toBeUndefined();
});

it("keeps an existing note and adds the close at the end; the chosen questions stay", async () => {
  await db.dailyNotes.put({ dayId, text: "Quiet start to the night.", createdAt: at(14, 20).toISOString(), updatedAt: at(14, 20).toISOString() });
  await shiftDown();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  const close = screen.getByRole("region", { name: "Close the day" });
  await close.getByRole("button", { name: "CHANGE QUESTIONS" }).click();
  await close.getByLabelText("Anything you're thankful for?").click();
  await close.getByRole("button", { name: "DONE" }).click();
  await close.getByLabelText("Anything you're thankful for?").fill("Partner kept dinner warm.");
  await close.getByRole("button", { name: "SAVE TO NOTE" }).click();
  await expect.poll(async () => (await db.dailyNotes.get(dayId))?.text).toBe(
    "Quiet start to the night.\n\n#close Sat, Nov 14\nQ: Anything you're thankful for?\nA: Partner kept dinner warm.");
  expect(JSON.parse(localStorage.getItem("beyond.close.prompts.v1")!)).toEqual(["LEARN", "THANKFUL"]);
});
