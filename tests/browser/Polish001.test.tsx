import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, updateSchedulePattern, logWater, logSleep, markWorkEnded, submitCheckIn } from "../../src/application/commands";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { markAppOpened } from "../../src/ui/appSession";
import { setModePin } from "../../src/application/modePinQueries";
import { MODE_ORDER } from "../../src/ui/screens/today/shiftClock";
import { ModeCity } from "../../src/ui/screens/today/ModeIdentity";

let dayId: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 12, 17, 10));
  await page.viewport(390, 844);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  dayId = (await startDay()).id;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.scrollTo(0, 0); });

it("logs water in two taps, stays on TODAY, and guards duplicate log/undo taps", async () => {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
  const add = sheet.getByRole("button", { name: "+12 oz", exact: true }).element() as HTMLButtonElement;
  add.click(); add.click();
  await expect.poll(() => getEffectiveHydrationTotal(dayId)).toBe(12);
  await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
  await expect.poll(() => document.querySelector("dialog[open]")).toBeNull();
  await expect.element(screen.getByRole("button", { name: "UNDO", exact: true })).toBeVisible();
  const undo = screen.getByRole("button", { name: "UNDO", exact: true }).element() as HTMLButtonElement;
  undo.click(); undo.click();
  await expect.poll(() => getEffectiveHydrationTotal(dayId)).toBe(0);
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  expect(await db.events.where("type").equals("WATER_LOG_VOIDED").count()).toBe(1);
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "Repeat last", exact: true })).toBeDisabled();
});

it("repeats the latest canonical water amount", async () => {
  await logWater(dayId, 12);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  await screen.getByRole("button", { name: "Repeat last (12 oz)", exact: true }).click();
  await expect.poll(() => getEffectiveHydrationTotal(dayId)).toBe(24);
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(2);
});

it("keeps a failed water sheet open for one safe retry", async () => {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Log water", exact: true }).click();
  const failure = vi.spyOn(db.events, "add").mockRejectedValue(new Error("Disk full"));
  await screen.getByRole("button", { name: "+8 oz", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Water didn't save");
  expect(await getEffectiveHydrationTotal(dayId)).toBe(0);
  failure.mockRestore();
  await screen.getByRole("button", { name: "+8 oz", exact: true }).click();
  await expect.poll(() => getEffectiveHydrationTotal(dayId)).toBe(8);
});

async function fillMeal(screen: Awaited<ReturnType<typeof render>>) {
  await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
  await screen.getByRole("textbox", { name: "New meal name" }).fill("Shift dinner");
  for (const [field, value] of [["calories", "600"], ["protein (g)", "45"], ["carbs (g)", "60"], ["fat (g)", "15"]])
    await screen.getByRole("spinbutton", { name: `New meal ${field}` }).fill(value!);
}

for (const fail of [false, true]) it(`SAVE & LOG is exactly-once${fail ? " after an injected log failure" : " on repeated taps"}`, async () => {
  const screen = await render(<App />);
  await fillMeal(screen);
  const failure = fail ? vi.spyOn(db.events, "add").mockRejectedValue(new Error("Disk full")) : null;
  const save = screen.getByRole("button", { name: "SAVE & LOG", exact: true }).element() as HTMLButtonElement;
  save.click(); save.click();
  await expect.poll(() => db.savedMeals.count()).toBe(1);
  if (fail) {
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Meal saved. Logging failed.");
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
    failure!.mockRestore();
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
  }
  await expect.poll(() => db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
  expect(await db.savedMeals.count()).toBe(1);
});

for (const withSleep of [false, true]) it(`asks about sleep at 13:00 only without main sleep (${withSleep})`, async () => {
  vi.setSystemTime(new Date(2026, 9, 13, 7, 30));
  await markWorkEnded(dayId);
  vi.setSystemTime(new Date(2026, 9, 13, 13));
  markAppOpened();
  if (withSleep) await logSleep(dayId, 300, "PRIMARY");
  const screen = await render(<TodayScreen onOpenBody={() => {}} />);
  await expect.element(screen.getByRole("button", { name: /Mode .*Change mode/ })).toBeVisible();
  await expect.poll(() => document.querySelectorAll("[data-recover-sleep-prompt]").length).toBe(withSleep ? 0 : 1);
  if (!withSleep) {
    await screen.getByRole("button", { name: "LOG MAIN SLEEP", exact: true }).click();
    await expect.element(screen.getByText("Slept up to 5 hr 30 min?", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(0);
  }
});

for (const [hour, minute, pin] of [[7, 30, null], [12, 59, null], [13, 0, "OFF"]] as const)
  it(`keeps the sleep prompt out of other times and displayed modes (${hour}:${minute}, ${pin})`, async () => {
    vi.setSystemTime(new Date(2026, 9, 13, hour, minute));
    if (pin) setModePin(dayId, pin);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: /Mode .*Change mode/ })).toBeVisible();
    if (pin) await expect.poll(() => document.querySelector(".mode-header")?.getAttribute("data-mode")).toBe(pin);
    await expect.poll(() => document.querySelectorAll("[data-recover-sleep-prompt]").length).toBe(0);
  });

it("NOT YET records no sleep or other domain event", async () => {
  vi.setSystemTime(new Date(2026, 9, 13, 13));
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByRole("heading", { name: "Did you sleep?", exact: true })).toBeVisible();
  const before = await db.events.toArray();
  await screen.getByRole("button", { name: "NOT YET", exact: true }).click();
  await expect.element(screen.getByText("Log main sleep when you're ready.", { exact: true })).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
});

it("holds header/card/numbers/actions order and the phone fold in every pinned mode", async () => {
  await submitCheckIn(dayId, { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 5 });
  for (const [width, height] of [[360, 800], [390, 844]]) {
    await page.viewport(width!, height!);
    for (const mode of MODE_ORDER) {
      setModePin(dayId, mode);
      const screen = await render(<TodayScreen />);
      await expect.poll(() => document.querySelector(".mode-header")?.getAttribute("data-mode")).toBe(mode);
      const header = document.querySelector(".today-situation")!.getBoundingClientRect();
      const card = document.querySelector(".console-guidance")!.getBoundingClientRect();
      const numbers = document.querySelector(".today-numbers")!.getBoundingClientRect();
      const actions = document.querySelector(".console-controls")!.getBoundingClientRect();
      expect(header.bottom).toBeLessThanOrEqual(card.top);
      expect(card.bottom).toBeLessThanOrEqual(numbers.top);
      expect(numbers.bottom).toBeLessThanOrEqual(actions.top);
      expect(actions.bottom).toBeLessThanOrEqual(height! - 64);
      // POLISH-002: buildings stand below the mode name and meta, as in the prototype; the beam
      // marks a real action, and goes dark ON SHIFT.
      const meta = document.querySelector(".cc-mode-meta")!.getBoundingClientRect();
      const city = document.querySelector(".cc-skyline")!.getBoundingClientRect();
      const tallest = Math.min(...[...document.querySelectorAll(".cc-skyline .cc-city")].map((path) => path.getBoundingClientRect().top));
      expect(Math.max(city.top, tallest)).toBeGreaterThanOrEqual(meta.bottom);
      expect(document.querySelectorAll(".cc-beam")).toHaveLength(mode === "SCHEDULED_SHIFT" ? 0 : 1);
      await screen.unmount();
    }
  }
});

it("lights a fraction of building windows and gates the beam on Engine action", async () => {
  const night = await render(<ModeCity now={new Date(2026, 9, 12, 23, 40)} workDay hasAction />);
  expect((night.container.querySelector(".cc-sky") as HTMLElement).style.opacity).toBe("1");
  expect(night.container.querySelectorAll("rect").length).toBeGreaterThan(0);
  expect(night.container.querySelector(".cc-beam")).not.toBeNull();
  await night.unmount();
  const day = await render(<ModeCity now={new Date(2026, 9, 13, 11)} workDay hasAction={false} />);
  expect((day.container.querySelector(".cc-sky") as HTMLElement).style.opacity).toBe("0");
  expect(day.container.querySelector(".cc-beam")).toBeNull();
});
