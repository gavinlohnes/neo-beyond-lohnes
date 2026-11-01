import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logSleep, logWater, startDay } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { rememberFact } from "../../src/application/alfred/alfredMemory";
import { addHomeItem } from "../../src/application/homeCommands";
import { answerQuestion } from "../../src/application/helper/freeAnswers";

/** FREE-HELPER-001: answers come from his records, say what's missing, and never invent. Invented data. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 2, 17)); });
afterEach(() => { vi.useRealTimers(); db.close(); });

it("says honestly when nothing is logged", async () => {
  expect(await answerQuestion("how much water today?")).toBe("No day is started yet, so there's no water to count.");
  await startDay();
  expect(await answerQuestion("how much water today?")).toBe("No water logged today yet.");
  expect(await answerQuestion("how did I sleep this week?")).toBe("No main sleep logged in the last 7 days.");
});

it("answers today's numbers and sleep with how many days stand behind them", async () => {
  const day = await startDay();
  await logWater(day.id, 16); await logWater(day.id, 20);
  await logSleep(day.id, 390, "PRIMARY");
  expect(await answerQuestion("how much water so far")).toBe("Water today: 36 oz.");
  expect(await answerQuestion("how did I sleep this week?")).toBe("Main sleep, last 7 days: average 6h 30m, from 1 of 1 days logged.");
  expect(await answerQuestion("how did I sleep last night?")).toMatch(/^Last main sleep logged: 6h 30m/);
});

it("lists what's planned or due, and looks up what he asked Alfred to keep", async () => {
  await createObligation({ title: "Call the bank", plannedAt: "2026-11-03" });
  await createObligation({ title: "Pay the car", dueAt: "2026-11-05" });
  expect(await answerQuestion("what's due this week?")).toBe("Tue, Nov 3: Call the bank (planned)\nThu, Nov 5: Pay the car (due)");
  expect(await answerQuestion("what's planned tomorrow?")).toBe("Tue, Nov 3: Call the bank (planned)");
  expect(await answerQuestion("anything due friday?")).toBe("Nothing planned or due on Fri, Nov 6.");
  await rememberFact("Locker number is 214", "WORK");
  await addHomeItem({ item: "Furnace filter", details: "16x25x1" });
  expect(await answerQuestion("locker number?")).toMatch(/^Locker number is 214 \(saved /);
  expect(await answerQuestion("filter size?")).toMatch(/^Furnace filter: 16x25x1 \(saved /);
});

it("knows when it doesn't know", async () => {
  expect(await answerQuestion("should I train tonight?")).toBeNull();
  expect(await answerQuestion("why am I so tired lately")).toBeNull();
  expect(await answerQuestion("what's the capital of France?")).toBeNull();
});

it("doesn't answer advice, food facts or other days with today's totals (review of #366)", async () => {
  const day = await startDay();
  await logWater(day.id, 16);
  for (const q of ["how many calories in a banana?", "how much water should I drink?", "how many calories did I eat Monday?",
    "should I sleep more?", "is my protein enough?", "how much protein in my shake?"]) expect(await answerQuestion(q), q).toBeNull();
  expect(await answerQuestion("how much water have I had?")).toBe("Water today: 16 oz.");
});

it("yesterday means the lived day before this one, not just the second-newest record", async () => {
  vi.setSystemTime(new Date(2026, 9, 28, 17)); await startDay();
  vi.setSystemTime(new Date(2026, 10, 2, 17)); await startDay();
  expect(await answerQuestion("what did I eat yesterday?")).toBe("No day is recorded for yesterday.");
});
