import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { HabitLadderLine } from "../../src/ui/screens/today/HabitLadderLine";
import { TodayQuietSettings } from "../../src/ui/screens/more/TodayQuietSettings";
import { createHabit, setHabitAnswer } from "../../src/application/habitCommands";
import { getLadderAnswers, readLadderOff } from "../../src/application/habitLadder";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { mostRecentBoundaryAtOrBefore } from "../../src/engine/dayRollover";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { todaySettled } from "./helpers/todaySettled";

/** GRAYSON-CHALLENGE-LADDER-001 (C6.6): the habit check-in line on TODAY, through real lived days and habit answers. */
beforeEach(async () => { await page.viewport(320, 800); });
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });
const base = () => mostRecentBoundaryAtOrBefore(new Date()).getTime() + 30 * 60_000;
const dayBack = (k: number) => new Date(base() - k * 86_400_000);
/** Lived days k days back (oldest first), answering the habit; today (k = 0) gets a normal check-in and no answer. */
async function seed(answers: Record<number, "DONE" | "NOT_DONE">) {
  const habit = await createHabit({ name: "Stretch", kind: "ANY_DAY" });
  for (const k of Object.keys(answers).map(Number).sort((a, b) => b - a)) {
    const d = await startDay(dayBack(k).toISOString());
    await setHabitAnswer(habit.id, answers[k]!, d.id);
  }
  const today = await startDay(dayBack(0).toISOString());
  await submitCheckIn(today.id, { energy: 4, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0 });
  return habit;
}
const fits = (root: Element) => {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  for (const b of root.querySelectorAll("button")) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
};

it("ASK after two misses: one tap saves what got in the way, then the line is done for the day", async () => {
  const habit = await seed({ 4: "NOT_DONE", 3: "DONE", 2: "NOT_DONE", 1: "DONE" });
  const screen = await render(<HabitLadderLine now={new Date()} />);
  const line = screen.getByRole("region", { name: "Habit check-in" });
  await expect.element(line.getByText(/^Stretch didn't happen .+\. What got in the way\?$/)).toBeVisible();
  fits(line.element());
  expect((await axe.run(line.element())).violations).toEqual([]);
  await line.getByRole("button", { name: "Forgot", exact: true }).click();
  await expect.element(screen.getByText("Saved. Delta won't ask again today.")).toBeVisible();
  expect(await getLadderAnswers()).toMatchObject([{ habitId: habit.id, stage: "ASK", answer: "FORGOT", missDate: formatLocalDate(dayBack(2)) }]);
  await expect.element(screen.getByRole("group", { name: "What got in the way?" })).not.toBeInTheDocument();
});

it("NAME says what his answers point to; CHANGE THE PLAN opens Habits and goes quiet", async () => {
  const habit = await seed({ 6: "NOT_DONE", 5: "DONE", 4: "NOT_DONE", 3: "DONE", 2: "NOT_DONE", 1: "DONE" });
  const earlier = (k: number) => formatLocalDate(dayBack(k));
  for (const k of [6, 4]) await db.events.add({ id: `a${k}`, type: "HABIT_LADDER_ANSWERED", occurredAt: dayBack(k).toISOString(), recordedAt: dayBack(k).toISOString(), source: "USER", correlationId: habit.id, seq: 10_000 + k,
    payload: { habitId: habit.id, habitName: "Stretch", stage: "ASK", answer: "PLAN", date: earlier(k), missDate: earlier(k) } } as never);
  const open = vi.fn();
  const screen = await render(<HabitLadderLine now={new Date()} onOpenHabits={open} />);
  const line = screen.getByRole("region", { name: "Habit check-in" });
  await expect.element(line.getByText(/Your answers point to: the plan doesn't fit\.$/)).toBeVisible();
  await line.getByText("WHY THIS?").click();
  await expect.element(line.getByText("The plan doesn't fit").first()).toBeVisible();
  fits(line.element());
  expect((await axe.run(line.element())).violations).toEqual([]);
  await line.getByRole("button", { name: "CHANGE THE PLAN" }).click();
  await expect.poll(() => open.mock.calls.length).toBe(1);
  expect((await getLadderAnswers()).at(-1)).toMatchObject({ stage: "NAME", answer: "CHANGE_PLAN" });
});

it("stop asking turns it off for that habit, with UNDO, and TODAY settings can turn it back on", async () => {
  const habit = await seed({ 4: "NOT_DONE", 2: "NOT_DONE" });
  const screen = await render(<HabitLadderLine now={new Date()} />);
  await screen.getByRole("button", { name: "Stop asking about Stretch" }).click();
  await expect.element(screen.getByText(/^Delta won't ask about Stretch\./)).toBeVisible();
  expect(readLadderOff().has(habit.id)).toBe(true);
  await screen.getByRole("button", { name: "UNDO" }).click();
  await expect.poll(() => readLadderOff().has(habit.id)).toBe(false);
  await cleanup();
  localStorage.setItem("beyond.habitLadder.v1", JSON.stringify({ off: [habit.id] }));
  const settings = await render(<TodayQuietSettings />);
  await settings.getByRole("button", { name: "Ask about Stretch again" }).click();
  expect(readLadderOff().has(habit.id)).toBe(false);
  await expect.element(settings.getByText("Habit check-ins (when a habit keeps slipping)")).toBeVisible();
});

it("on TODAY it is one of the quiet lines, and his TODAY switch turns it off for every habit", async () => {
  await seed({ 4: "NOT_DONE", 2: "NOT_DONE" });
  let screen = await render(<TodayScreen />);
  await todaySettled();
  await expect.element(screen.getByRole("group", { name: "Quiet lines" }).getByRole("region", { name: "Habit check-in" })).toBeVisible();
  await cleanup();
  localStorage.setItem("beyond.todayQuiet.v1", JSON.stringify({ max: 2, order: [], off: ["HABIT_LADDER"], oneAfterShift: true }));
  screen = await render(<TodayScreen />);
  await todaySettled();
  await new Promise((r) => setTimeout(r, 750)); // the line loads on its own; give it time to (not) appear
  expect(screen.getByRole("region", { name: "Habit check-in" }).elements()).toHaveLength(0);
  await expect.element(screen.getByRole("group", { name: "Quiet lines" })).toBeInTheDocument();
});
