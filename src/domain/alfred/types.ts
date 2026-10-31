/**
 * ALFRED-004 (owner go 2026-10-31, "Alfred remembers"): a fact the owner asked Alfred to keep — a
 * birthday, a size, a bill's amount. Saved only on the owner's confirm; forgotten only on his word.
 */
export const MEMORY_TOPICS = ["PERSON", "MONEY", "HEALTH", "HOME", "WORK", "OTHER"] as const;
export type MemoryTopic = (typeof MEMORY_TOPICS)[number];
export interface AlfredMemory {
  id: string;
  text: string;
  topic: MemoryTopic;
  savedAt: string; // ISO
}
