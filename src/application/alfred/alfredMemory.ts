import { db } from "../../persistence/db";
import { newId } from "../commands";
import { getMemoryFacts, recordMemory } from "../memory";
import { writeAtomically } from "../atomicWrite";
import type { AlfredMemory, MemoryTopic, MemoryReference } from "../../domain/alfred/types";
import type { MemoryFact, MemoryVia } from "../../domain/memory";

/** C6.7: a kept old entry keeps the date he first said it, so Delta reads the same date after his review. */
const asMemory = (f: MemoryFact): AlfredMemory => ({ id: f.factId, text: f.statement, topic: f.topic!, savedAt: f.origin?.savedAt ?? f.createdAt, recordedAt: f.recordedAt, lastConfirmedAt: f.lastConfirmedAt,
  reference: { source: "PERSONAL_FACT", id: f.factId, revision: f.id } });
const legacyRevision = (m: AlfredMemory) => JSON.stringify([m.id, m.text, m.topic, m.savedAt]);
/** New facts share the existing confirmed event lifecycle; no lived day is created. */
export async function rememberFact(text: string, topic: MemoryTopic, via: MemoryVia = "DELTA"): Promise<AlfredMemory> {
  return asMemory(await recordMemory({ factId: newId(), expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", statement: text, topic, via }));
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
    return recordMemory({ factId: newId(), expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", statement, topic, via: "OLD_ENTRY",
      origin: { kind: "ALFRED_MEMORY", id: row.id, text: row.text, topic: row.topic, savedAt: row.savedAt } });
  });
}

/** The longest words a memory holds (memory.ts snapshot). */
export const MEMORY_MAX = 280;
/**
 * C6.7 review, DON'T KEEP: converts the old entry and stops it in one write, so it leaves Delta's context but stays
 * restorable under Stopped. Nothing is deleted; the original words stay as evidence. An entry too long to be a fact
 * as written is stored shortened with an ellipsis (it is stopped, so Delta never reads it; the origin keeps the whole).
 */
export async function declineLegacyMemory(source: AlfredMemory): Promise<MemoryFact> {
  return writeAtomically(["alfredMemories", "beyondDays"], async () => {
    const words = source.text.trim();
    // Already converted (e.g. kept, then declined): stop that fact rather than converting again. Checked first, never
    // caught, because a failed nested write would abort this one.
    const fact = (await getMemoryFacts()).find((f) => f.origin?.id === source.id)
      ?? await convertLegacyMemory(source, words.length <= MEMORY_MAX ? words : `${words.slice(0, MEMORY_MAX - 1)}…`, source.topic);
    if (fact.status === "IRRELEVANT") return fact;
    return recordMemory({ factId: fact.factId, expectedPreviousId: fact.id, action: "IRRELEVANT" });
  });
}
/** C6.7 review, KEEP THE REST AS WRITTEN: every given old entry that fits as written, in one write. */
export async function keepLegacyMemories(sources: readonly AlfredMemory[]): Promise<number> {
  return writeAtomically(["alfredMemories", "beyondDays"], async () => {
    let kept = 0;
    for (const s of sources) if (s.text.trim().length <= MEMORY_MAX) { await convertLegacyMemory(s, s.text.trim(), s.topic); kept++; }
    return kept;
  });
}
/** C6.7 review, UNDO after FIX: a correction back to the old words (only when they fit as a fact). */
export async function undoLegacyFix(fact: MemoryFact): Promise<MemoryFact> {
  const words = fact.origin?.text.trim();
  if (!words || words.length > MEMORY_MAX) throw new Error("The old words are too long to put back. Correct the memory instead.");
  return recordMemory({ factId: fact.factId, expectedPreviousId: fact.id, action: "CORRECTED", statement: words, topic: fact.origin!.topic });
}
/** C6.7: the old entries not yet reviewed (converted ones are retained evidence, never listed). */
export async function getUnreviewedLegacyMemories(): Promise<AlfredMemory[]> {
  return (await getMemories()).filter((m) => m.reference?.source === "ALFRED_MEMORY");
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
