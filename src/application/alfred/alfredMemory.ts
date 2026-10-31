import { db } from "../../persistence/db";
import { newId } from "../commands";
import type { AlfredMemory, MemoryTopic } from "../../domain/alfred/types";

/** ALFRED-004: the facts the owner asked Alfred to keep. Each write follows his confirm. */
export async function rememberFact(text: string, topic: MemoryTopic): Promise<AlfredMemory> {
  const memory: AlfredMemory = { id: newId(), text: text.trim(), topic, savedAt: new Date().toISOString() };
  await db.alfredMemories.add(memory);
  return memory;
}

export async function forgetFact(id: string): Promise<void> {
  if (!(await db.alfredMemories.get(id))) throw new Error(`MEMORY_NOT_FOUND: ${id}`);
  await db.alfredMemories.delete(id);
}

export async function getMemories(): Promise<AlfredMemory[]> {
  return db.alfredMemories.orderBy("savedAt").toArray();
}
