import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { markWorkEnded, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { resolvePriorDayContinuity } from "../../src/application/continuityQueries";
import { getAdvisoryNotes } from "../../src/application/advisoryQueries";

/**
 * Drop 1.6b (owner approval 2026-10-03, field soak): yesterday's undecided
 * "Shift down after work" isn't brought back as an advisory on a day declared
 * OFF. The locked continuity rule still resolves it exactly as before.
 */
const GREEN = { energy: 5, stress: 1, mood: 5, soreness: 0, alcoholUrge: 0 } as const;
// A Wednesday that's not a scheduled work day (default schedule, Week A), so no PROTECT note either.
const OFF_DAY_WEDNESDAY = new Date(2026, 7, 19, 10, 0, 0);

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

async function yesterdaysUndecidedShiftDown() {
  const day1 = await startDay();
  await setWorkContext(day1.id, "WORK", "MANUAL");
  await markWorkEnded(day1.id);
  const { recommendation } = await submitCheckIn(day1.id, GREEN);
  expect(recommendation.kind).toBe("POST_SHIFT_TRANSITION");
  return startDay();
}

describe("work-day memory on a day off", () => {
  it("is not shown when today is declared OFF — the continuity rule itself is unchanged", async () => {
    const day2 = await yesterdaysUndecidedShiftDown();
    await setWorkContext(day2.id, "OFF", "MANUAL");
    await submitCheckIn(day2.id, GREEN);

    expect((await resolvePriorDayContinuity((await db.beyondDays.get(day2.id))!))?.resolution).toBe("REINTRODUCE");
    const notes = await getAdvisoryNotes(OFF_DAY_WEDNESDAY);
    expect(notes.some((n) => n.sourceModule === "continuity")).toBe(false);
  });

  it("is still shown on a work day", async () => {
    const day2 = await yesterdaysUndecidedShiftDown();
    await setWorkContext(day2.id, "WORK", "MANUAL");
    await submitCheckIn(day2.id, GREEN);

    const notes = await getAdvisoryNotes(OFF_DAY_WEDNESDAY);
    expect(notes.find((n) => n.sourceModule === "continuity")?.message).toBe('"Shift down after work" from last time is still relevant today.');
  });
});
