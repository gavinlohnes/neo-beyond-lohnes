import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { getMemoryFacts, getMemoryWorkspace, projectMemory, recordMemory } from "../../src/application/memory";
import { startDay, endDay, submitCheckIn } from "../../src/application/commands";
import { previewRestore, applyRestore } from "../../src/persistence/backup";
import type { MemoryKind } from "../../src/domain/memory";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 27, 17)); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const create = (dayId: string, factId = "food", kind: MemoryKind = "PREP_FOOD", statement = "Frozen meals are a good backup for me.") => recordMemory({ dayId, factId, kind, statement, action: "CREATED", expectedPreviousId: null });
async function snapshot() { return Promise.all(db.tables.filter((table) => table.name !== "events").map(async (table) => [table.name, await table.toArray()])); }

it("reads empty without writing, then stores explicit provenance with no consumption/task/recommendation side effects", async () => {
  expect(await getMemoryWorkspace()).toEqual({ facts: [], dayId: null });
  const day = await startDay(); const before = await snapshot(), events = await db.events.toArray();
  const fact = await create(day.id);
  expect(fact).toMatchObject({ statement: "Frozen meals are a good backup for me.", source: "OPERATOR", status: "ACTIVE", kind: "PREP_FOOD", createdAt: new Date().toISOString(), lastConfirmedAt: new Date().toISOString() });
  expect(await snapshot()).toEqual(before);
  expect((await db.events.toArray()).filter((event) => !events.some((e) => e.id === event.id)).map((e) => [e.type, e.source, e.beyondDayId])).toEqual([["MEMORY_RECORDED", "USER", day.id]]);
  const read = await db.events.toArray(); await getMemoryWorkspace(); expect(await db.events.toArray()).toEqual(read);
});

it("corrects text/kind, re-confirms, retains irrelevant history, and explicitly restores with honest timestamps", async () => {
  const day = await startDay(), original = await create(day.id);
  vi.setSystemTime(new Date(2026, 9, 27, 17, 1));
  const corrected = await recordMemory({ dayId: day.id, factId: original.factId, expectedPreviousId: original.id, action: "CORRECTED", kind: "RECOVERY", statement: "Quiet first after work." });
  expect(corrected.createdAt).toBe(original.createdAt); expect(corrected.lastConfirmedAt).not.toBe(original.lastConfirmedAt);
  vi.setSystemTime(new Date(2026, 9, 27, 17, 2));
  const confirmed = await recordMemory({ dayId: day.id, factId: original.factId, expectedPreviousId: corrected.id, action: "CONFIRMED" });
  expect(confirmed.lastConfirmedAt).toBe(new Date().toISOString());
  vi.setSystemTime(new Date(2026, 9, 27, 17, 3));
  const irrelevant = await recordMemory({ dayId: day.id, factId: original.factId, expectedPreviousId: confirmed.id, action: "IRRELEVANT" });
  expect(irrelevant.status).toBe("IRRELEVANT"); expect(irrelevant.lastConfirmedAt).toBe(confirmed.lastConfirmedAt);
  const restored = await recordMemory({ dayId: day.id, factId: original.factId, expectedPreviousId: irrelevant.id, action: "RESTORED" });
  expect(restored.history.map((entry) => entry.action)).toEqual(["CREATED", "CORRECTED", "CONFIRMED", "IRRELEVANT", "RESTORED"]);
  expect(restored.lastConfirmedAt).toBe(new Date().toISOString());
  expect(restored.history[0]!.statement).toBe(original.statement); expect(restored.status).toBe("ACTIVE");
});

it("serializes retries and guards stale editors, confirmations and restores without duplicating facts", async () => {
  const day = await startDay();
  const [first, retry] = await Promise.all([create(day.id), create(day.id)]);
  expect(retry.id).toBe(first.id); expect((await getMemoryFacts())).toHaveLength(1);
  const input = { dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "CONFIRMED" as const };
  const [a, b] = await Promise.all([recordMemory(input), recordMemory(input)]); expect(a.id).toBe(b.id);
  await expect(recordMemory({ ...input, action: "CORRECTED", statement: "Stale words" })).rejects.toThrow("changed elsewhere");
  const irrelevant = await recordMemory({ ...input, expectedPreviousId: a.id, action: "IRRELEVANT" });
  await expect(recordMemory({ ...input, action: "RESTORED" })).rejects.toThrow("changed elsewhere");
  await expect(create(day.id, "food", "PREP_FOOD", "Different create retry")).rejects.toThrow("different words");
  expect((await getMemoryFacts())[0]!.id).toBe(irrelevant.id);
  expect(await db.events.where("type").equals("MEMORY_RECORDED").count()).toBe(3);
});

it("follows supersession across a clock correction and refuses imported forks/orphans instead of guessing", async () => {
  const day = await startDay(), first = await create(day.id);
  vi.setSystemTime(new Date(2026, 9, 27, 16, 59));
  const corrected = await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "CORRECTED", statement: "New words despite a corrected clock." });
  expect((await getMemoryFacts())[0]!.id).toBe(corrected.id);
  const rows = await db.events.where("type").equals("MEMORY_RECORDED").toArray();
  const revision = rows.find((row) => row.id === corrected.id)!;
  expect(() => projectMemory([...rows, { ...revision, id: "fork" }])).toThrow("conflicting");
  expect(() => projectMemory([revision])).toThrow("incomplete");
  expect(() => projectMemory([{ ...rows[0]!, source: "ENGINE" }])).toThrow("conflicting");
  expect(() => projectMemory([{ ...rows[0]!, payload: { statement: "malformed" } }])).toThrow("conflicting");
});

it("persists across midnight/new days and native restore including irrelevant revisions; old backups stay empty", async () => {
  const day = await startDay(); const old = new File([await db.export()], "before-memory.json");
  const first = await create(day.id); const irrelevant = await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "IRRELEVANT" });
  const backup = new File([await db.export()], "memory.json"); expect((await previewRestore(backup)).databaseVersion).toBe(db.verno);
  vi.setSystemTime(new Date(2026, 9, 28, 3)); expect((await getMemoryFacts())[0]!.id).toBe(irrelevant.id);
  vi.setSystemTime(new Date(2026, 9, 28, 17)); const next = await startDay();
  expect(next.id).not.toBe(day.id); expect((await getMemoryFacts())[0]!.history).toHaveLength(2);
  await applyRestore(old); expect(await getMemoryFacts()).toEqual([]);
  await applyRestore(backup); expect((await getMemoryFacts())[0]).toMatchObject({ id: irrelevant.id, status: "IRRELEVANT", source: "OPERATOR" });
});

it("rejects invalid/old-day/ended/due writes and rolls back failed event insertion", async () => {
  const day = await startDay();
  await expect(create(day.id, "bad", "PREP_FOOD", " ")).rejects.toThrow("1–280");
  await expect(create(day.id, "bad", "PREP_FOOD", "x".repeat(281))).rejects.toThrow("1–280");
  const add = vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("QuotaExceededError"));
  await expect(create(day.id)).rejects.toThrow("Quota"); add.mockRestore(); expect(await getMemoryFacts()).toEqual([]);
  vi.setSystemTime(new Date(2026, 9, 28, 17)); await expect(create(day.id)).rejects.toThrow("day changed");
  await endDay(day.id); await expect(create(day.id)).rejects.toThrow("day changed");
  await startDay(); await expect(create(day.id)).rejects.toThrow("day changed");
});

it("leaves the Engine recommendation and trace identical before and after confirmed memory", async () => {
  const day = await startDay(), answers = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
  const before = (await submitCheckIn(day.id, answers)).recommendation;
  await create(day.id, "recovery", "RECOVERY", "Sleep before training fits me.");
  const after = (await submitCheckIn(day.id, answers)).recommendation;
  expect(after.kind).toBe(before.kind); expect(after.title).toBe(before.title); expect(after.trace).toEqual(before.trace);
});
