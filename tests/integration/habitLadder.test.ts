import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHabit, setHabitAnswer } from "../../src/application/habitCommands";
import { answerLadder, getHabitLadderLine, getLadderAnswers, setLadderHabitOff } from "../../src/application/habitLadder";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** GRAYSON-CHALLENGE-LADDER-001 (C6.6) through real habit answers and lived days. Lived days start at 16:30. */
const at = (day: number, hour = 17) => new Date(2026, 10, day, hour).toISOString();
const clock = (day: number, hour = 20) => vi.setSystemTime(new Date(2026, 10, day, hour));
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); clock(10);
  await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());
async function live(day: number, habitId: string, answer: "DONE" | "NOT_DONE", energy?: 1 | 2 | 3 | 4 | 5) {
  clock(day);
  const d = await startDay(at(day));
  if (energy) await submitCheckIn(d.id, { energy, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0 });
  await setHabitAnswer(habitId, answer, d.id);
  return d;
}

it("asks after two misses, saves his answer once, then stays quiet the rest of the day", async () => {
  const habit = await createHabit({ name: "Stretch", kind: "ANY_DAY" });
  await live(20, habit.id, "NOT_DONE"); await live(21, habit.id, "DONE"); await live(22, habit.id, "NOT_DONE");
  clock(22, 21);
  const line = (await getHabitLadderLine())!;
  expect(line).toMatchObject({ stage: "ASK", habitId: habit.id, missDate: "2026-11-22" });
  await answerLadder(line, "FORGOT");
  await answerLadder(line, "FORGOT"); // the same tap twice
  expect(await getLadderAnswers()).toEqual([{ habitId: habit.id, habitName: "Stretch", stage: "ASK", answer: "FORGOT", date: "2026-11-22", missDate: "2026-11-22" }]);
  const events = await db.events.where("type").equals("HABIT_LADDER_ANSWERED").toArray();
  expect(events.map((e) => [e.source, e.beyondDayId])).toEqual([["USER", undefined]]);
  expect(await getHabitLadderLine()).toBeNull(); // one ladder answer a day
  await expect(answerLadder(line, "SHIFT")).rejects.toThrow("already answered");
});

it("never shows on a low-energy day, and not for a habit he turned off", async () => {
  const habit = await createHabit({ name: "Stretch", kind: "ANY_DAY" });
  await live(20, habit.id, "NOT_DONE"); await live(21, habit.id, "NOT_DONE", 2);
  clock(21, 21);
  expect(await getHabitLadderLine()).toBeNull();
  await live(22, habit.id, "NOT_DONE", 4);
  clock(22, 21);
  expect((await getHabitLadderLine())?.stage).toBe("ASK");
  setLadderHabitOff(habit.id, true);
  expect(await getHabitLadderLine()).toBeNull();
  setLadderHabitOff(habit.id, false);
  expect((await getHabitLadderLine())?.stage).toBe("ASK");
});

it("refuses an answer to a line that has changed since it was shown", async () => {
  const habit = await createHabit({ name: "Stretch", kind: "ANY_DAY" });
  await live(20, habit.id, "NOT_DONE"); await live(22, habit.id, "NOT_DONE");
  clock(22, 21);
  const line = (await getHabitLadderLine())!;
  await setHabitAnswer(habit.id, "DONE", (await db.beyondDays.orderBy("startedAt").last())!.id);
  await expect(answerLadder(line, "FORGOT")).rejects.toThrow("changed since");
  expect(await getLadderAnswers()).toEqual([]);
});
