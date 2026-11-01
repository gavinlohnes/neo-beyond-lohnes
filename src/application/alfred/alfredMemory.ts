import { db } from "../../persistence/db";
import { newId } from "../commands";
import { getMemoryFacts, recordMemory } from "../memory";
import { writeAtomically } from "../atomicWrite";
import type { AlfredMemory, MemoryTopic, MemoryReference } from "../../domain/alfred/types";
import type { MemoryFact } from "../../domain/memory";

const asMemory = (f: MemoryFact): AlfredMemory => ({ id: f.factId, text: f.statement, topic: f.topic!, savedAt: f.createdAt, recordedAt: f.recordedAt, lastConfirmedAt: f.lastConfirmedAt,
  reference: { source: "PERSONAL_FACT", id: f.factId, revision: f.id } });
const legacyRevision = (m: AlfredMemory) => JSON.stringify([m.id, m.text, m.topic, m.savedAt]);
/** New facts share the existing confirmed event lifecycle; no lived day is created. */
export async function rememberFact(text: string, topic: MemoryTopic): Promise<AlfredMemory> {
  return asMemory(await recordMemory({ factId: newId(), expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", statement: text, topic }));
}

/** Legacy-only physical deletion. A converted source is retained evidence, never a second active fact. */
export async function forgetFact(id: string, expectedRevision?: string, expectedText?: string): Promise<void> {
  return writeAtomically(["alfredMemories"], async () => {
    const row = await db.alfredMemories.get(id);
    if (!row) throw new Error(`MEMORY_NOT_FOUND: ${id}`);
    if (expectedText !== undefined && row.text !== expectedText) throw new Error("Memory changed. Reopen it before forgetting.");
    if (expectedRevision !== undefined && legacyRevision(row) !== expectedRevision) throw new Error("Memory changed. Reopen it before forgetting.");
    if ((await getMemoryFacts()).some((f) => f.origin?.id === id)) throw new Error("This entry was converted. Stop using its personal fact; its original evidence is retained.");
    await db.alfredMemories.delete(id);
  });
}
export async function stopUsingMemory(reference: MemoryReference, expectedText?: string): Promise<void> {
  if (reference.source === "ALFRED_MEMORY") return forgetFact(reference.id, reference.revision, expectedText);
  await changePersonalFact(reference, "IRRELEVANT", expectedText);
}
export async function restoreMemory(reference: Extract<MemoryReference, { source: "PERSONAL_FACT" }>, expectedText?: string): Promise<void> {
  await changePersonalFact(reference, "RESTORED", expectedText);
}
async function changePersonalFact(reference: Extract<MemoryReference, { source: "PERSONAL_FACT" }>, action: "IRRELEVANT" | "RESTORED", expectedText?: string) {
  return writeAtomically(["alfredMemories", "beyondDays"], async () => {
    const fact = (await getMemoryFacts()).find((f) => f.factId === reference.id);
    if (!fact || fact.kind !== "PERSONAL_FACT") throw new Error("Personal fact source unavailable. Nothing changed.");
    if (expectedText !== undefined && fact.statement !== expectedText) throw new Error("Memory changed. Reopen the matching fact before confirming.");
    return recordMemory({ factId: reference.id, expectedPreviousId: reference.revision, action });
  });
}
/** One confirmed conversion, with exact original evidence. Retry is idempotent even after retirement. */
export async function convertLegacyMemory(source: AlfredMemory, statement: string, topic: MemoryTopic): Promise<MemoryFact> {
  return writeAtomically(["alfredMemories", "beyondDays"], async () => {
    const row = await db.alfredMemories.get(source.id);
    if (!row || legacyRevision(row) !== legacyRevision(source)) throw new Error("Original memory changed. Your draft is kept; reopen the conversion preview.");
    const existing = (await getMemoryFacts()).find((f) => f.origin?.id === row.id);
    if (existing) {
      const root = existing.history[0]!;
      if (root.statement === statement.trim() && root.topic === topic) return existing;
      throw new Error("Already converted with different words. Correct the saved personal fact instead.");
    }
    return recordMemory({ factId: newId(), expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", statement, topic,
      origin: { kind: "ALFRED_MEMORY", id: row.id, text: row.text, topic: row.topic, savedAt: row.savedAt } });
  });
}
/** Compatibility view for People, Home and Alfred. No inactive history/original evidence escapes. */
export async function getMemories(): Promise<AlfredMemory[]> {
  return db.transaction("r", [db.events, db.alfredMemories], async () => {
    const facts = await getMemoryFacts();
    const converted = new Set(facts.flatMap((f) => f.origin ? [f.origin.id] : []));
    const rows = await db.alfredMemories.orderBy("savedAt").toArray();
    return [...rows.filter((m) => !converted.has(m.id)).map((m) => ({ ...m, reference: { source: "ALFRED_MEMORY" as const, id: m.id, revision: legacyRevision(m) } })),
      ...facts.filter((f) => f.kind === "PERSONAL_FACT" && f.status === "ACTIVE").map(asMemory)]
      .sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  });
}
