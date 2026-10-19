import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";
import { getActiveDay } from "../../src/application/queries";
import { getModePin, setModePin } from "../../src/application/modePinQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

const at = (day: number, hour: number, minute = 0, second = 0, ms = 0) => new Date(2026, 9, day, hour, minute, second, ms);
const source = () => document.querySelector(".mode-header__source")?.textContent ?? "";
const suit = () => document.documentElement.dataset.suitMode;
const originalURL = window.location.href;
const records = () => Promise.all(db.tables.map(async (table) => [table.name, await table.toArray()]));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at(12, 22));
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks();
  history.replaceState(null, "", originalURL); window.scrollTo(0, 0);
});

async function runningWorkout() {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const workout = await startWorkout(day.id, "A", "STANDARD");
  setModePin(day.id, "OFF");
  return { day, workout };
}

async function openCapture(screen: Awaited<ReturnType<typeof render>>) {
  await screen.getByRole("button", { name: "Open LOG", exact: true }).click();
  await screen.getByRole("dialog", { name: "LOG" }).getByRole("button", { name: /^Note/ }).click();
}

describe("16:30 mode pin expiry", () => {
  for (const width of [320, 360, 412]) it(`expires on the retained TODAY clock at ${width}px, keeps focus and both drafts, and writes no record`, async () => {
    await page.viewport(width, 800);
    const { day, workout } = await runningWorkout();
    vi.setSystemTime(at(13, 16, 29, 59, 750));
    const screen = await render(<App />);
    await screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).fill("85");
    await screen.getByRole("spinbutton", { name: "Set 1 repetitions" }).fill("9");
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.poll(source).toMatch(/(^| · )Pinned · /);
    await expect.poll(suit).toBe("OFF");
    await openCapture(screen);
    const capture = screen.getByRole("textbox", { name: "Capture a thought", exact: true });
    await capture.fill("Keep this thought through 16:30");
    const focused = document.activeElement;
    const before = await records();
    vi.setSystemTime(at(13, 16, 30));
    // No resume/navigation event: the short boundary timer must refresh the visible screen.
    await expect.poll(source).toMatch(/^(Per schedule|Shift (in|ends in) .+?) · /);
    await expect.poll(suit).toBe("EXPECTED_POST_WORK");
    await expect.element(capture).toHaveValue("Keep this thought through 16:30");
    expect(document.activeElement).toBe(focused);
    expect(await records()).toEqual(before);
    expect((await getActiveDay())?.id).toBe(day.id);
    expect((await db.workoutSessions.get(workout.id))?.status).toBe("ACTIVE");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(screen.getByRole("main").elements()).toHaveLength(1);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" })).toHaveValue(85);
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 repetitions" })).toHaveValue(9);
    expect(await db.performedSets.count()).toBe(0);
  });

  it("expires direct BODY launch tokens at the boundary before TODAY has ever mounted", async () => {
    await page.viewport(360, 800);
    const { day } = await runningWorkout();
    history.replaceState(null, "", "?go=water");
    const screen = await render(<App />);
    await expect.element(screen.getByRole("heading", { name: "BODY // WATER" })).toBeVisible();
    expect(document.getElementById("workspace-TODAY")).toBeNull();
    await expect.poll(suit).toBe("OFF");
    vi.setSystemTime(at(13, 16, 29, 59, 750));
    window.dispatchEvent(new Event("pageshow"));
    const before = await records();
    vi.setSystemTime(at(13, 16, 30));
    await expect.poll(suit).toBe("EXPECTED_POST_WORK");
    expect(document.getElementById("workspace-TODAY")).toBeNull();
    expect(await records()).toEqual(before);
    expect((await getActiveDay())?.id).toBe(day.id);
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.poll(source).toMatch(/^(Per schedule|Shift (in|ends in) .+?) · /);
  });

  for (const event of ["visibilitychange", "pageshow"]) it(`re-reads an expired pin on ${event} resume without discarding Capture input`, async () => {
    const { day } = await runningWorkout();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.poll(source).toMatch(/(^| · )Pinned · /);
    await openCapture(screen);
    const capture = screen.getByRole("textbox", { name: "Capture a thought", exact: true });
    await capture.fill("Keep this on resume");
    vi.setSystemTime(at(13, 17));
    (event === "pageshow" ? window : document).dispatchEvent(new Event(event));
    await expect.poll(source).toMatch(/^(Per schedule|Shift (in|ends in) .+?) · /);
    await expect.element(capture).toHaveValue("Keep this on resume");
    expect((await getActiveDay())?.id).toBe(day.id);
    expect(await db.captureItems.count()).toBe(0);
  });

  it("preserves a pre-update pin before its boundary and expires it on reload after the boundary", async () => {
    const { day } = await runningWorkout();
    localStorage.setItem(`beyond:modePin:${day.id}`, "OFF");
    const first = await render(<TodayScreen />);
    await expect.poll(source).toMatch(/(^| · )Pinned · /);
    await first.unmount();
    vi.setSystemTime(at(13, 16, 30));
    await render(<TodayScreen />);
    await expect.poll(source).toMatch(/^(Per schedule|Shift (in|ends in) .+?) · /);
    expect(getModePin(day.id, day.startedAt)).toBeNull();
    expect((await getActiveDay())?.id).toBe(day.id);
  });
});
