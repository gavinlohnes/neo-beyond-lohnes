import { db } from "../persistence/db";
import { formatLocalDate } from "../engine/scheduledContext";
import type { TimeCapsuleOpenedPayload, TimeCapsuleSealedPayload } from "../domain/common/types";
import { byTimeThenSeq } from "./queries";

/**
 * NOTES-CAPSULE-001 (owner rulings 2026-10-04): capsules waiting to open
 * (dates only, never their text) and capsules that have opened but haven't
 * been read on TODAY yet. Read only.
 */

export interface SealedCapsule {
  eventId: string;
  sealedAt: string;
  opensOn: string;
}

export interface OpenedCapsule extends SealedCapsule {
  note: string;
}

export interface TimeCapsuleState {
  /** Still sealed, soonest first. No text: it stays hidden until its date. */
  waiting: SealedCapsule[];
  /** Due (opensOn on or before today) and not yet marked read, oldest first. */
  due: OpenedCapsule[];
}

export async function getTimeCapsules(now: Date = new Date()): Promise<TimeCapsuleState> {
  const [sealed, opened] = await Promise.all([
    db.events.where("type").equals("TIME_CAPSULE_SEALED").toArray(),
    db.events.where("type").equals("TIME_CAPSULE_OPENED").toArray(),
  ]);
  const read = new Set(opened.map((e) => (e.payload as TimeCapsuleOpenedPayload).capsuleEventId));
  const today = formatLocalDate(now);
  sealed.sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq));
  const waiting: SealedCapsule[] = [];
  const due: OpenedCapsule[] = [];
  for (const e of sealed) {
    const { note, opensOn } = e.payload as TimeCapsuleSealedPayload;
    if (opensOn > today) waiting.push({ eventId: e.id, sealedAt: e.recordedAt, opensOn });
    else if (!read.has(e.id)) due.push({ eventId: e.id, sealedAt: e.recordedAt, opensOn, note });
  }
  waiting.sort((a, b) => a.opensOn.localeCompare(b.opensOn));
  return { waiting, due };
}
