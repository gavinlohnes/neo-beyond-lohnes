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
  reference?: MemoryReference;
  recordedAt?: string;
  lastConfirmedAt?: string;
}

/** ALFRED-006: a weekly review Alfred wrote (Monday–Sunday lived days, by their start date). */
export interface AlfredReview {
  id: string;
  weekStart: string; // YYYY-MM-DD, a Monday
  weekEnd: string; // YYYY-MM-DD, the Sunday
  text: string;
  writtenAt: string; // ISO
}

/** Explicit storage owner. Old proposal IDs refer only to legacy rows. */
export type MemoryReference = { source: "ALFRED_MEMORY"; id: string; revision: string } | { source: "PERSONAL_FACT"; id: string; revision: string };
