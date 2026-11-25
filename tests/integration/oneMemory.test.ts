import { afterEach, expect, it } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { getMemoryFacts, projectMemory, recordMemory } from "../../src/application/memory";
import { convertLegacyMemory, declineLegacyMemory, getMemories, getUnreviewedLegacyMemories, keepLegacyMemories, rememberFact, restoreMemory, undoLegacyFix } from "../../src/application/alfred/alfredMemory";
import { addHomeItem } from "../../src/application/homeCommands";
import { addPersonDate } from "../../src/application/peopleCommands";
import type { AlfredMemory } from "../../src/domain/alfred/types";

/** GRAYSON-ONE-MEMORY-001 (C6.7): where a memory came from, and the old-entry review, at the application layer. */
afterEach(async () => { await db.delete(); await db.open(); });
const row = (id: string, text: string, savedAt = "2026-01-01T12:00:00.000Z"): AlfredMemory => ({ id, text, topic: "HOME", savedAt });

it("events saved before C6.7 (no via) still parse and project unchanged", async () => {
  await recordMemory({ factId: "f1", expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", topic: "WORK", statement: "Locker 12" });
  const events = await db.events.where("type").equals("MEMORY_RECORDED").toArray();
  expect(JSON.stringify(events[0]!.payload)).not.toContain("via");
  const [fact] = projectMemory(events);
  expect(fact).toMatchObject({ statement: "Locker 12", status: "ACTIVE" });
  expect(fact!.history[0]!.via).toBeUndefined();
});

it("via is set by the command that saved it and survives every later action", async () => {
  await rememberFact("Gate code 1234", "HOME");
  await addHomeItem({ item: "Filter", details: "20x25x1" });
  await addPersonDate({ person: "Sam", occasion: "Birthday", month: 3, day: 14 });
  expect((await getMemoryFacts()).map((f) => f.history[0]!.via).sort()).toEqual(["DELTA", "HOME", "PEOPLE"]);
  const delta = (await getMemoryFacts()).find((f) => f.statement === "Gate code 1234")!;
  expect(delta.history[0]!.via).toBe("DELTA");
  const corrected = await recordMemory({ factId: delta.factId, expectedPreviousId: delta.id, action: "CORRECTED", statement: "Gate code 4321", topic: "HOME", via: "MEMORY" });
  expect(corrected.via).toBe("DELTA"); // copied forward; a later write can't rewrite where it came from
  const stopped = await recordMemory({ factId: delta.factId, expectedPreviousId: corrected.id, action: "IRRELEVANT" });
  const restored = await recordMemory({ factId: delta.factId, expectedPreviousId: stopped.id, action: "RESTORED" });
  const confirmed = await recordMemory({ factId: delta.factId, expectedPreviousId: restored.id, action: "CONFIRMED" });
  expect([stopped.via, restored.via, confirmed.via]).toEqual(["DELTA", "DELTA", "DELTA"]);
  for (const f of await getMemoryFacts()) for (const h of f.history) expect(h.via).toBe(f.history[0]!.via);
});

it("KEEP, FIX, DON'T KEEP and each UNDO keep the old words as evidence and change nothing else", async () => {
  await db.alfredMemories.bulkAdd([row("a", "Trash goes out Tuesday"), row("b", "Spare key under the mat"), row("c", "Filter size 16x25x1")]);
  const [a, b, c] = await getUnreviewedLegacyMemories();
  await convertLegacyMemory(c!, c!.text, c!.topic);
  const fixed = await convertLegacyMemory(a!, "Trash goes out Wednesday", "HOME");
  await undoLegacyFix(fixed);
  const declined = await declineLegacyMemory(b!);
  expect(declined).toMatchObject({ status: "IRRELEVANT", statement: "Spare key under the mat" });
  expect((await getMemories()).map((m) => m.text).sort()).toEqual(["Filter size 16x25x1", "Trash goes out Tuesday"]);
  await restoreMemory({ source: "PERSONAL_FACT", id: declined.factId, revision: declined.id });
  expect((await getMemories()).map((m) => m.text).sort()).toEqual(["Filter size 16x25x1", "Spare key under the mat", "Trash goes out Tuesday"]);
  expect(await getUnreviewedLegacyMemories()).toEqual([]);
  expect(await db.alfredMemories.count()).toBe(3);
  // A kept old entry keeps the date he first said it.
  expect((await getMemories()).every((m) => m.savedAt === "2026-01-01T12:00:00.000Z")).toBe(true);
});

it("DON'T KEEP twice is harmless; KEEP THE REST skips entries over 280 characters", async () => {
  await db.alfredMemories.bulkAdd([row("a", "Short one"), row("b", "x".repeat(300)), row("c", "Another short one")]);
  const entries = await getUnreviewedLegacyMemories();
  const first = await declineLegacyMemory(entries[0]!);
  expect(await declineLegacyMemory(entries[0]!)).toEqual(first);
  expect((await getMemoryFacts()).filter((f) => f.origin?.id === "a")).toHaveLength(1);
  expect(await keepLegacyMemories(entries.slice(1))).toBe(1);
  expect((await getUnreviewedLegacyMemories()).map((m) => m.id)).toEqual(["b"]);
});

it("a native backup keeps converted, declined and unreviewed entries; an older backup without via restores", async () => {
  await db.alfredMemories.bulkAdd([row("a", "Kept as written"), row("b", "Not kept"), row("c", "Not reviewed yet")]);
  await rememberFact("Saved before C6.7", "WORK");
  const [a, b] = await getUnreviewedLegacyMemories();
  await convertLegacyMemory(a!, a!.text, a!.topic);
  await declineLegacyMemory(b!);
  const view = async () => ({ facts: (await getMemoryFacts()).map((f) => [f.statement, f.status, f.history.map((h) => [h.action, h.via ?? null])]).sort(),
    memories: (await getMemories()).map((m) => m.text).sort(), unreviewed: (await getUnreviewedLegacyMemories()).map((m) => m.id) });
  const before = await view();
  const blob = await db.export();
  await db.alfredMemories.clear(); await db.events.clear();
  await db.import(new File([blob], "beyond.json", { type: "application/json" }), { clearTablesBeforeImport: true });
  expect(await view()).toEqual(before);
  expect(before.unreviewed).toEqual(["c"]);
  // An older backup: the same events with every via removed still import and project.
  await db.events.toCollection().modify((e) => { if (e.type === "MEMORY_RECORDED") delete (e.payload as { via?: unknown }).via; });
  const older = await db.export();
  await db.import(new File([older], "older.json", { type: "application/json" }), { clearTablesBeforeImport: true });
  expect((await getMemoryFacts()).map((f) => f.statement).sort()).toEqual(before.facts.map((f) => f[0]).sort());
});

it("a chain whose via changes partway (imported or hand-edited) is refused, like a changed origin", async () => {
  const first = await recordMemory({ factId: "f1", expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", topic: "WORK", statement: "Locker 12", via: "DELTA" });
  await recordMemory({ factId: "f1", expectedPreviousId: first.id, action: "CONFIRMED" });
  const events = await db.events.where("type").equals("MEMORY_RECORDED").toArray();
  expect(() => projectMemory(events)).not.toThrow();
  const tampered = events.map((e, i) => i === 1 ? { ...e, payload: { ...(e.payload as object), via: "HOME" } } : e);
  expect(() => projectMemory(tampered)).toThrow();
});
