import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { logUrge, respondToUrgePlan, saveQuitHabit } from "../../src/application/quitCommands";
import { getQuitHabit } from "../../src/application/quitQueries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { parseQuitHabit } from "../../src/persistence/quitHabitValidation";

/** Drop 4 (urge if-then plans, 2026-10-03), against real Dexie (fake-indexeddb). */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("if-then plans on the habit", () => {
  it("saves one plan per trigger, trimmed, and an empty set clears them", async () => {
    await saveQuitHabit({ name: "Drinking", ifThenPlans: { AFTER_SHIFT: "  Shower and eat first  ", STRESS: "Walk 10 min" } });
    expect((await getQuitHabit())?.ifThenPlans).toEqual({ AFTER_SHIFT: "Shower and eat first", STRESS: "Walk 10 min" });

    await saveQuitHabit({ name: "Drinking", ifThenPlans: {} });
    expect((await getQuitHabit())?.ifThenPlans).toBeUndefined();
  });

  it("refuses a plan over 140 characters or for an unknown trigger", async () => {
    await expect(saveQuitHabit({ name: "Drinking", ifThenPlans: { STRESS: "x".repeat(141) } })).rejects.toThrow();
    await expect(saveQuitHabit({ name: "Drinking", ifThenPlans: { NOPE: "x" } as never })).rejects.toThrow();
  });

  it("survives the read path a restore uses", () => {
    const row = { id: "current", name: "Drinking", ifThenPlans: { TIRED: "Nap first" }, createdAt: "x", updatedAt: "x" };
    expect(parseQuitHabit(row)?.ifThenPlans).toEqual({ TIRED: "Nap first" });
  });
});

describe("respondToUrgePlan", () => {
  it("records PLAN USED / NOT THIS TIME against the urge, with the plan as it read", async () => {
    await saveQuitHabit({ name: "Drinking", ifThenPlans: { AFTER_SHIFT: "Shower and eat first" } });
    const day = await startDay();
    const urgeId = await logUrge(day.id, "AFTER_SHIFT");

    await respondToUrgePlan(day.id, urgeId, true);

    const [event] = await db.events.where("type").equals("URGE_PLAN_RESPONDED").toArray();
    expect(event!.payload).toMatchObject({ urgeEventId: urgeId, trigger: "AFTER_SHIFT", plan: "Shower and eat first", used: true });
    expect(event!.causationId).toBe(urgeId);
    // A manual entry the operator chose to make, counted by the Burden Meter.
    expect((await getDaySummaries())[0]!.burden.manualEntries).toBe(2);
  });

  it("refuses when the trigger has no plan, or the urge isn't on this day", async () => {
    await saveQuitHabit({ name: "Drinking", ifThenPlans: { AFTER_SHIFT: "Shower and eat first" } });
    const day = await startDay();
    const stress = await logUrge(day.id, "STRESS");
    await expect(respondToUrgePlan(day.id, stress, true)).rejects.toThrow(/URGE_PLAN_NOT_SET/);
    await expect(respondToUrgePlan("another-day", stress, true)).rejects.toThrow(/URGE_NOT_FOUND/);
    expect(await db.events.where("type").equals("URGE_PLAN_RESPONDED").count()).toBe(0);
  });
});
