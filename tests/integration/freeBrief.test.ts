import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logSleep, logWater, startDay } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { freeBrief } from "../../src/application/helper/freeBrief";

/** FREE-BRIEF-001: TODAY's brief from records only; missing logs are said to be missing. Invented data. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 2, 19)); });
afterEach(() => { vi.useRealTimers(); db.close(); });

it("says nothing without a day, and says what's missing instead of zero", async () => {
  expect(await freeBrief()).toEqual([]);
  await startDay();
  expect(await freeBrief()).toEqual(["So far today: no food logged, no water logged."]);
});

it("reads today's logs, last sleep and what's on for today", async () => {
  const day = await startDay();
  await logWater(day.id, 24); await logSleep(day.id, 370);
  await createObligation({ title: "Call the bank", plannedAt: "2026-11-02" });
  expect(await freeBrief()).toEqual([
    "So far today: no food logged, 24 oz water.",
    "Last main sleep logged: 6h 10m.",
    "On for today: Call the bank.",
  ]);
});
