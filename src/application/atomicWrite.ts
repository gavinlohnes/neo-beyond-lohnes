import { db } from "../persistence/db";

/**
 * WORKOUT-ATOMICITY-001 (#221) and COMMAND-ATOMICITY-002 (#225, owner
 * approval 2026-10-13): the one place a compound command opens its Dexie
 * read-write transaction, so a canonical row write and the DomainEvent that
 * records it commit together or roll back together. Without it, a crash,
 * closed tab, quota or storage error between the two writes left a record
 * that history never mentions (or the reverse), and the screens that read
 * rows and the screens that read events disagreed from then on.
 *
 * Guard reads (exists / current status / already-done idempotency) run
 * inside the same transaction, so two overlapping calls in one tab are
 * serialized by IndexedDB instead of both passing the guard and both
 * writing.
 *
 * Every table a callback reads or writes must be named, or Dexie rejects
 * the access. `nextSeq()`'s cold-start read scans events, checkIns and
 * recommendations, so those three are always included. A command that
 * calls another transactional command (rollover → endDay/startDay,
 * satisfy → next occurrence, capture conversion → createObligation) joins
 * the caller's transaction, which Dexie only allows when the inner table
 * list is a subset of the outer one — hence one shared list per command
 * family rather than a hand-picked list per function.
 *
 * A rolled-back write can leave a gap in `seq` numbering (the in-memory
 * counter already advanced). `seq` only orders events; gaps were already
 * possible for the day rollover transaction.
 */
const SEQ_TABLES = ["events", "checkIns", "recommendations"] as const;

/** Day lifecycle, check-in → recommendation, work context, outcome rating, rollover. */
export const DAY_WRITE_TABLES = [
  "beyondDays",
  "workoutSessions",
  "schedulePatterns",
  "outcomes",
  // submitCheckIn reads unresolved obligations and their missions for arbitration.
  "missions",
  "obligations",
] as const;

/** Missions & Obligations lifecycle, recurring next occurrence, Capture conversion. */
export const INTENT_WRITE_TABLES = ["missions", "obligations", "captureItems", "projects"] as const;

/** Decision Journal create / modify / review. */
/** ROUTINES-001: routine definitions; ticks are day events. */
export const ROUTINE_WRITE_TABLES = ["routines", "beyondDays"] as const;

export const JOURNAL_WRITE_TABLES = ["decisionJournalEntries"] as const;

/** TRAIN start / log / skip / complete / abandon. */
export const WORKOUT_WRITE_TABLES = ["workoutSessions", "performedSets"] as const;

/** REVIEW-001 progress photos: add / correct / hide / delete permanently. */
export const PHOTO_WRITE_TABLES = ["progressPhotos"] as const;

export function writeAtomically<T>(tables: readonly string[], write: () => Promise<T>): Promise<T> {
  return db.transaction("rw", [...new Set([...tables, ...SEQ_TABLES])], write);
}
