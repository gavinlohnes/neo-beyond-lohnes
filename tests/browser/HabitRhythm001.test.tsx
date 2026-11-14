import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { HabitsPanel } from "../../src/ui/components/HabitsPanel";
import { createHabit, setHabitAnswer } from "../../src/application/habitCommands";
import { getHabitWorkspace } from "../../src/application/habitQueries";
import { startDay, setWorkContext } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import "../../src/ui/screens/more/operator.css";

vi.mock("../../src/application/habitQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/habitQueries")>();
  return { ...actual, getHabitWorkspace: vi.fn(actual.getHabitWorkspace) };
});
vi.mock("../../src/application/habitCommands", async (original) => {
  const actual = await original<typeof import("../../src/application/habitCommands")>();
  return { ...actual, setHabitAnswer: vi.fn(actual.setHabitAnswer) };
});
const now = new Date(2026, 10, 14, 20);
const at = (d: number) => new Date(2026, 10, d, 17).toISOString();
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); await page.viewport(360, 1000); vi.mocked(setHabitAnswer).mockClear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
async function seed(name = "Stretch") {
  const past = await startDay(at(13)); await setWorkContext(past.id, "WORK", "MANUAL");
  const habit = await createHabit({ name, kind: "ANY_DAY" });
  await setHabitAnswer(habit.id, "DONE", past.id);
  const today = await startDay(at(14)); vi.mocked(setHabitAnswer).mockClear();
  return { past, today, habit };
}

it("records all three answers and corrects a past lived day without changing today or erasing history", async () => {
  const { past, today, habit } = await seed();
  const screen = await render(<HabitsPanel active />);
  const card = screen.getByRole("article", { name: "Stretch", exact: true });
  await card.getByRole("button", { name: "Didn't do it", exact: true }).click();
  await expect.element(card.getByRole("button", { name: "Didn't do it", exact: true })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Done", exact: true }).click();
  await expect.element(card.getByRole("button", { name: "Done", exact: true })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Not recorded", exact: true }).click();
  await expect.element(card.getByRole("button", { name: "Not recorded", exact: true })).toHaveAttribute("aria-pressed", "true");
  const before = await db.events.toArray();
  const history = card.getByRole("button", { name: "28-DAY HISTORY", exact: true });
  await history.click();
  const sheet = screen.getByRole("dialog", { name: "Stretch history", exact: true });
  await expect.element(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^Fri, Nov 13 · Done · work day/ }).click();
  expect(await db.events.toArray()).toEqual(before);
  await sheet.getByRole("button", { name: "Didn't do it", exact: true }).click();
  await expect.element(sheet.getByRole("button", { name: "Didn't do it", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await db.events.where("type").equals("HABIT_SET").toArray()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).at(-1)).toMatchObject({ beyondDayId: past.id, payload: { habitId: habit.id, answer: "NOT_DONE" } });
  const w = await getHabitWorkspace();
  expect(w.habits[0]!.answer).toBe("UNRECORDED"); expect(w.dayId).toBe(today.id);
  for (const event of before) expect(await db.events.get(event.id)).toEqual(event);
  await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
  await expect.poll(() => document.activeElement).toBe(history.element());
});

it("shows missing days without creating a historical day or a negative answer", async () => {
  await seed(); const before = await db.events.toArray(), days = await db.beyondDays.toArray();
  const screen = await render(<HabitsPanel active />);
  await screen.getByRole("button", { name: "28-DAY HISTORY", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "Stretch history" });
  await sheet.getByRole("button", { name: /^Thu, Nov 12/ }).click();
  await expect.element(sheet.getByText(/No BEYOND day was recorded here/)).toBeVisible();
  expect(sheet.getByRole("group", { name: "Record an answer" }).elements()).toHaveLength(0);
  expect(await db.events.toArray()).toEqual(before); expect(await db.beyondDays.toArray()).toEqual(days);
});

it("retries a read and a failed write without changing the selected date or claiming a save", async () => {
  await seed(); const before = await db.events.count();
  vi.mocked(getHabitWorkspace).mockRejectedValueOnce(new Error("read interrupted"));
  const screen = await render(<HabitsPanel active />);
  await screen.getByRole("button", { name: "RETRY HABITS", exact: true }).click();
  await screen.getByRole("button", { name: "28-DAY HISTORY", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "Stretch history" });
  await sheet.getByRole("button", { name: /^Fri, Nov 13/ }).click();
  vi.mocked(setHabitAnswer).mockRejectedValueOnce(new Error("storage interrupted"));
  await sheet.getByRole("button", { name: "Didn't do it", exact: true }).click();
  await expect.element(sheet.getByRole("alert")).toHaveTextContent("couldn't be saved");
  await expect.element(sheet.getByRole("heading", { name: "Fri, Nov 13", exact: true })).toBeVisible();
  expect(await db.events.count()).toBe(before);
  await sheet.getByRole("button", { name: "Didn't do it", exact: true }).click();
  await expect.element(sheet.getByRole("button", { name: "Didn't do it", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await db.events.count()).toBe(before + 1);
});

it("blocks same-tick double submission while a write is unresolved", async () => {
  await seed(); const before = await db.events.where("type").equals("HABIT_SET").count();
  const real = vi.mocked(setHabitAnswer).getMockImplementation()!;
  let release!: () => void;
  const held = new Promise<void>((r) => { release = r; });
  vi.mocked(setHabitAnswer).mockImplementationOnce(async (...args) => { await held; return real(...args); });
  const screen = await render(<HabitsPanel active />);
  const done = screen.getByRole("article", { name: "Stretch" }).getByRole("button", { name: "Done", exact: true });
  await expect.element(done).toBeEnabled();
  (done.element() as HTMLButtonElement).click(); (done.element() as HTMLButtonElement).click();
  await expect.poll(() => vi.mocked(setHabitAnswer).mock.calls.length).toBe(1);
  release();
  await expect.element(done).toHaveAttribute("aria-pressed", "true");
  expect(await db.events.where("type").equals("HABIT_SET").count()).toBe(before + 1);
});

it("supports keyboard history selection, 16px controls, narrow screens and axe without writing", async () => {
  await seed("An evening stretch and a long walk around the neighbourhood");
  const before = await db.events.toArray(); const screen = await render(<HabitsPanel active />);
  const history = screen.getByRole("button", { name: "28-DAY HISTORY", exact: true });
  await expect.element(history).toBeVisible();
  for (const width of [320, 360, 412, 1024]) {
    await page.viewport(width, 1200);
    const root = document.querySelector<HTMLElement>(".habits-panel")!;
    expect(root.scrollWidth, `root ${width}`).toBeLessThanOrEqual(root.clientWidth + 1);
    for (const c of root.querySelectorAll<HTMLElement>("button, input, select")) {
      if (!c.getClientRects().length) continue;
      expect(parseFloat(getComputedStyle(c).fontSize), c.textContent ?? "input").toBeGreaterThanOrEqual(16);
      expect(c.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  }
  expect((await axe.run(document.body)).violations).toEqual([]);
  await page.viewport(320, 1000); history.element().focus(); await userEvent.keyboard("{Enter}");
  const sheet = screen.getByRole("dialog", { name: /history$/ });
  await expect.element(sheet).toBeVisible();
  const day = sheet.getByRole("button", { name: /^Fri, Nov 13/ });
  day.element().focus(); await userEvent.keyboard("{Enter}");
  await expect.element(sheet.getByRole("heading", { name: "Fri, Nov 13", exact: true })).toBeVisible();
  expect(document.querySelector<HTMLElement>(".habit-history")!.scrollWidth).toBeLessThanOrEqual(document.querySelector<HTMLElement>(".habit-history")!.clientWidth + 1);
  expect((await axe.run(sheet.element())).violations).toEqual([]);
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => document.activeElement).toBe(history.element());
  expect(await db.events.toArray()).toEqual(before);
});

it("DATA shows explicit No honestly and opens the existing habits workspace without another record", async () => {
  const { habit, today } = await seed();
  await setHabitAnswer(habit.id, "NOT_DONE", today.id);
  const screen = await render(<App />);
  await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
  await expect.poll(() => document.querySelector('[data-dash="lifestyle"]')?.textContent).toContain("Stretch, didn't do it today×");
  const before = await db.events.toArray();
  await screen.getByRole("button", { name: "HABITS", exact: true }).click();
  await screen.getByRole("navigation", { name: "Life shortcuts", exact: true }).getByRole("button", { name: "Habits", exact: true }).click();
  const habits = screen.getByRole("region", { name: "Habits", exact: true });
  await expect.element(habits).toBeVisible();
  await expect.element(habits.getByRole("button", { name: "Didn't do it", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await db.events.toArray()).toEqual(before);
});
