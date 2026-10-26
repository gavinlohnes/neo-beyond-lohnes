import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { getPreparation, recordPreparation } from "../../src/application/preparation";
import { endDay, startDay } from "../../src/application/commands";
import { applyRestore } from "../../src/persistence/backup";
import type { PreparationValue } from "../../src/domain/preparation";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 26, 17)); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("PREP-001 canonical preparation facts", () => {
  it("reads unknown without writing, then saves food/bottle without consumption or obligations", async () => {
    const day = await startDay(); const before = await db.events.toArray();
    expect((await getPreparation(day.id)).FOOD.value).toBe("UNCONFIRMED"); expect(await db.events.toArray()).toEqual(before);
    await recordPreparation({ dayId: day.id, item: "FOOD", value: "READY", expectedPreviousId: null });
    await recordPreparation({ dayId: day.id, item: "BOTTLE", value: "READY", expectedPreviousId: null });
    const ids = new Set(before.map((e) => e.id));
    const events = (await db.events.toArray()).filter((e) => !ids.has(e.id));
    expect(events.map((e) => e.type)).toEqual(["PREPARATION_RECORDED", "PREPARATION_RECORDED"]);
    expect(events.every((e) => e.source === "USER" && e.beyondDayId === day.id)).toBe(true);
    expect(await db.obligations.count()).toBe(0);
  });
  it.each(["HOMEMADE", "FROZEN", "OTHER", "NOT_NEEDED"] as const)("accepts %s equally without nutritional claims", async (value) => {
    const day = await startDay(); await recordPreparation({ dayId: day.id, item: "FOOD", value, expectedPreviousId: null });
    expect((await getPreparation(day.id)).FOOD.value).toBe(value);
  });
  it("serializes duplicate calls and rejects stale revisions/undo without overwriting newer facts", async () => {
    const day = await startDay(); const input = { dayId: day.id, item: "FOOD" as const, value: "READY" as const, expectedPreviousId: null };
    const [a, b] = await Promise.all([recordPreparation(input), recordPreparation(input)]);
    expect(a.id).toBe(b.id); expect((await db.events.where("type").equals("PREPARATION_RECORDED").count())).toBe(1);
    const c = await recordPreparation({ ...input, value: "FROZEN", expectedPreviousId: a.id });
    await expect(recordPreparation({ ...input, value: "UNCONFIRMED", expectedPreviousId: a.id })).rejects.toThrow("changed elsewhere");
    const undone = await recordPreparation({ ...input, value: a.previousValue, expectedPreviousId: c.id });
    expect(undone.state.FOOD.value).toBe("UNCONFIRMED");
    expect(await db.events.where("type").equals("PREPARATION_RECORDED").count()).toBe(3);
  });
  it("survives midnight and backup/restore, while a new day starts with no preparation debt", async () => {
    const day = await startDay(); await recordPreparation({ dayId: day.id, item: "FOOD", value: "FROZEN", expectedPreviousId: null });
    vi.setSystemTime(new Date(2026, 9, 27, 3)); expect((await getPreparation(day.id)).FOOD.value).toBe("FROZEN");
    const file = new File([await db.export()], "prep.json"); await db.events.clear(); await applyRestore(file);
    expect((await getPreparation(day.id)).FOOD.value).toBe("FROZEN");
    vi.setSystemTime(new Date(2026, 9, 27, 17)); const next = await startDay();
    expect((await getPreparation(next.id)).FOOD.value).toBe("UNCONFIRMED");
    expect((await getPreparation(day.id)).FOOD.value).toBe("FROZEN");
    await expect(recordPreparation({ dayId: day.id, item: "FOOD", value: "READY", expectedPreviousId: null })).rejects.toThrow("day changed");
  });
  it("rejects ended or due-for-rollover days and invalid item choices without writing", async () => {
    const day = await startDay(); const before = await db.events.count();
    await expect(recordPreparation({ dayId: day.id, item: "BOTTLE", value: "FROZEN", expectedPreviousId: null })).rejects.toThrow("valid preparation");
    await expect(recordPreparation({ dayId: day.id, item: "FOOD", value: "BOGUS" as PreparationValue, expectedPreviousId: null })).rejects.toThrow("valid preparation");
    vi.setSystemTime(new Date(2026, 9, 27, 17));
    await expect(recordPreparation({ dayId: day.id, item: "FOOD", value: "READY", expectedPreviousId: null })).rejects.toThrow("day changed");
    expect(await db.events.count()).toBe(before);
    await endDay(day.id, "EXPLICIT_END_DAY");
    await expect(recordPreparation({ dayId: day.id, item: "FOOD", value: "READY", expectedPreviousId: null })).rejects.toThrow("day changed");
  });
  it("restores an older backup without inventing confirmations", async () => {
    const day = await startDay(); const file = new File([await db.export()], "older.json");
    await recordPreparation({ dayId: day.id, item: "FOOD", value: "READY", expectedPreviousId: null }); await applyRestore(file);
    expect((await getPreparation(day.id)).FOOD.value).toBe("UNCONFIRMED");
  });
  it("a failed event write rolls back and leaves preparation unchanged", async () => {
    const day = await startDay(); const write = vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("QuotaExceededError"));
    await expect(recordPreparation({ dayId: day.id, item: "FOOD", value: "READY", expectedPreviousId: null })).rejects.toThrow(); write.mockRestore();
    expect((await getPreparation(day.id)).FOOD.value).toBe("UNCONFIRMED");
  });
});
