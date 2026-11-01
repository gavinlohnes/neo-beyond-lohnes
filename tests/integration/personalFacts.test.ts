import { afterEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { getMemoryFacts, projectMemory, recordMemory } from "../../src/application/memory";
import { convertLegacyMemory, forgetFact, getMemories, rememberFact, stopUsingMemory, restoreMemory } from "../../src/application/alfred/alfredMemory";
import { readOperatorContext } from "../../src/application/operatorContext";
import { searchRecords } from "../../src/application/alfred/alfredSearch";
import { startDay } from "../../src/application/commands";
import { addPersonDate } from "../../src/application/peopleCommands";
import { addHomeItem } from "../../src/application/homeCommands";
import { applyRestore } from "../../src/persistence/backup";
import type { AlfredMemory } from "../../src/domain/alfred/types";
const legacy = (text = "Original keepsake"): AlfredMemory => ({ id: "legacy", text, topic: "PERSON", savedAt: "2026-01-01T12:00:00.000Z" });
afterEach(() => vi.restoreAllMocks());

it("keeps global facts correctable through retire/restore, with no day, task or recommendation", async () => {
  const m = await rememberFact("Filter is 16x25x1", "HOME");
  expect(await db.alfredMemories.count()).toBe(0);
  expect(await db.beyondDays.count()).toBe(0); expect(await db.obligations.count()).toBe(0); expect(await db.recommendations.count()).toBe(0);
  const first = (await getMemoryFacts())[0]!;
  expect(first.beyondDayId).toBeUndefined(); expect(m.reference).toMatchObject({ source: "PERSONAL_FACT", revision: first.id });
  const corrected = await recordMemory({ factId: first.factId, expectedPreviousId: first.id, action: "CORRECTED", statement: "Filter is 20x25x1", topic: "HOME" });
  await expect(recordMemory({ factId: first.factId, expectedPreviousId: first.id, action: "IRRELEVANT" })).rejects.toThrow("changed elsewhere");
  await stopUsingMemory({ source: "PERSONAL_FACT", id: first.factId, revision: corrected.id });
  expect(await getMemories()).toEqual([]); expect(await searchRecords("Filter")).not.toContain("20x25x1");
  expect((await readOperatorContext({ purpose: "conversation", includePersonal: true })).text).not.toContain("Filter is");
  const retired = (await getMemoryFacts())[0]!;
  await restoreMemory({ source: "PERSONAL_FACT", id: retired.factId, revision: retired.id });
  expect((await getMemories())[0]!.text).toBe("Filter is 20x25x1");
  expect((await getMemoryFacts())[0]!.history).toHaveLength(4);
  await startDay(); await rememberFact("Global even with a day", "OTHER");
  expect((await getMemoryFacts()).every((f) => !f.beyondDayId)).toBe(true);
});

it("preserves old day guards and rejects corrections that widen purpose/sharing", async () => {
  await expect(recordMemory({ factId: "old", action: "CREATED", expectedPreviousId: null, kind: "CONSTRAINT", statement: "Quiet" })).rejects.toThrow("day changed");
  const day = await startDay();
  const f = await recordMemory({ dayId: day.id, factId: "old", action: "CREATED", expectedPreviousId: null, kind: "CONSTRAINT", statement: "Quiet" });
  await expect(recordMemory({ factId: f.factId, expectedPreviousId: f.id, action: "CORRECTED", kind: "PERSONAL_FACT", topic: "OTHER" })).rejects.toThrow();
  const m = await rememberFact("Model AB40", "HOME");
  await expect(recordMemory({ dayId: day.id, factId: m.id, expectedPreviousId: m.reference!.revision, action: "CORRECTED", kind: "CONSTRAINT" })).rejects.toThrow();
  const c = await readOperatorContext({ purpose: "conversation", includePersonal: false });
  expect(c.text).toContain("Model AB40"); expect(c.text).not.toContain(": Quiet");
});

it("converts one entry atomically and idempotently; retirement never resurrects the retained original", async () => {
  const source = legacy(); await db.alfredMemories.add(source);
  const [a, b] = await Promise.all([convertLegacyMemory(source, "Destination words", "HOME"), convertLegacyMemory(source, "Destination words", "HOME")]);
  expect(a.id).toBe(b.id); expect(a.origin).toEqual({ kind: "ALFRED_MEMORY", ...source });
  expect(a.createdAt).not.toBe(source.savedAt); expect(await db.alfredMemories.get(source.id)).toEqual(source);
  expect((await getMemories()).map((m) => m.text)).toEqual(["Destination words"]);
  expect(await searchRecords("Original keepsake", 30, true)).not.toContain("Original keepsake ·");
  const context = await readOperatorContext({ purpose: "conversation", includePersonal: true });
  expect(context.text).not.toContain("Original keepsake"); expect(context.records.filter((r) => r.kind === "PERSONAL_FACT")).toHaveLength(1);
  await stopUsingMemory({ source: "PERSONAL_FACT", id: a.factId, revision: a.id });
  expect(await getMemories()).toEqual([]);
  expect((await convertLegacyMemory(source, "Destination words", "HOME")).status).toBe("IRRELEVANT");
  await expect(forgetFact(source.id)).rejects.toThrow("converted");
  await expect(convertLegacyMemory(source, "Different destination", "HOME")).rejects.toThrow("different words");
  expect((await getMemoryFacts())[0]!.history).toHaveLength(2);
});

it("retains long originals and rejects stale conversion previews, lost links and conflicting origins", async () => {
  const source = legacy("z".repeat(400)); await db.alfredMemories.add(source);
  await expect(convertLegacyMemory(source, source.text, "PERSON")).rejects.toThrow("1–280"); expect(await getMemoryFacts()).toEqual([]);
  await db.alfredMemories.update(source.id, { text: "Edited elsewhere" });
  await expect(convertLegacyMemory(source, "Shorter", "PERSON")).rejects.toThrow("changed");
  await db.alfredMemories.put(source); const fact = await convertLegacyMemory(source, "Chosen shorter", "PERSON");
  const events = await db.events.where("type").equals("MEMORY_RECORDED").toArray();
  expect(() => projectMemory([...events, { ...events[0]!, id: "duplicate", payload: { ...(events[0]!.payload as object), factId: "other" } }])).toThrow("conflicting");
  expect(fact.origin!.text).toHaveLength(400);
  await db.alfredMemories.delete(source.id);
  await expect(getMemories()).rejects.toThrow("incomplete");
  await expect(readOperatorContext({ purpose: "conversation", includePersonal: false })).rejects.toThrow("incomplete");
});

it("rolls back both People/Home facts and reminders on either write failure", async () => {
  const spy = vi.spyOn(db.obligations, "add").mockRejectedValue(new Error("disk full"));
  await expect(addPersonDate({ person: "Sam", occasion: "Birthday", month: 3, day: 14 })).rejects.toThrow("disk full");
  await expect(addHomeItem({ item: "Filter", details: "20x25x1", repeat: { every: 3, unit: "MONTHS", firstDue: "2027-01-01" } })).rejects.toThrow("disk full");
  expect(await getMemoryFacts()).toEqual([]); expect(await db.obligations.count()).toBe(0); spy.mockRestore();
  const eventSpy = vi.spyOn(db.events, "add").mockRejectedValue(new Error("event failed"));
  await expect(addPersonDate({ person: "Sam", occasion: "Birthday", month: 3, day: 14 })).rejects.toThrow("event failed");
  expect(await db.obligations.count()).toBe(0); eventSpy.mockRestore();
});

it("round-trips old legacy and new converted/retired history through native exports", async () => {
  const source = legacy(); await db.alfredMemories.add(source);
  const old = new File([await db.export()], "old.json");
  const f = await convertLegacyMemory(source, "New wording", "PERSON");
  await stopUsingMemory({ source: "PERSONAL_FACT", id: f.factId, revision: f.id });
  const backup = new File([await db.export()], "new.json");
  await applyRestore(old); expect((await getMemories())[0]!.reference!.source).toBe("ALFRED_MEMORY"); expect(await getMemoryFacts()).toEqual([]);
  await applyRestore(backup); expect(await getMemories()).toEqual([]); expect((await getMemoryFacts())[0]!.history).toHaveLength(2); expect(await db.alfredMemories.get(source.id)).toEqual(source);
});

it("uses explicit source/revision references and never guesses a store from a fact ID", async () => {
  const { toProposal, confirmProposal } = await import("../../src/application/alfred/alfredActions");
  const m = await rememberFact("General fact", "OTHER");
  expect(toProposal("memory_retire", { memory_id: m.id, text: m.text, revision: m.reference!.revision })).toBeNull();
  expect(toProposal("forget", { source: "PERSONAL_FACT", memory_id: m.id, text: m.text })).toBeNull();
  await expect(confirmProposal({ kind: "forget", source: "ALFRED_MEMORY", memory_id: m.id, text: m.text })).rejects.toThrow("MEMORY_NOT_FOUND");
  const p = toProposal("memory_retire", { source: "PERSONAL_FACT", memory_id: m.id, text: m.text, revision: m.reference!.revision })!;
  expect(await getMemories()).toHaveLength(1); // parsing only proposes
  const before = await db.events.count();
  await expect(confirmProposal({ kind: "memory_retire", source: "PERSONAL_FACT", memory_id: m.id, revision: m.reference!.revision, text: "Another fact shown on the card" })).rejects.toThrow("matching fact");
  expect(await db.events.count()).toBe(before);
  await confirmProposal(p); expect(await getMemories()).toEqual([]);
  const retired = (await getMemoryFacts())[0]!;
  await expect(restoreMemory({ source: "PERSONAL_FACT", id: retired.factId, revision: "stale" })).rejects.toThrow("changed elsewhere");
  const retiredEvents = await db.events.count();
  await expect(confirmProposal({ kind: "memory_restore", source: "PERSONAL_FACT", memory_id: retired.factId, revision: retired.id, text: "Wrong displayed wording" })).rejects.toThrow("matching fact");
  expect(await db.events.count()).toBe(retiredEvents);
  await confirmProposal({ kind: "memory_restore", source: "PERSONAL_FACT", memory_id: retired.factId, revision: retired.id, text: retired.statement });
  expect(await getMemories()).toHaveLength(1);
});
