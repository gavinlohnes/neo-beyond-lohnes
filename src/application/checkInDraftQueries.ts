import { db } from "../persistence/db";
import type { StateCheckIn } from "../domain/common/types";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";
import { draftCheckIn, type CheckInDraft } from "../engine/checkInDraft";
import { byTimeThenSeq } from "./queries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getCustomTemplates } from "./customTemplateQueries";

/**
 * Check-in draft (Drop 5): the I/O half. Reads the operator's latest check-in
 * (any day) and the Day Ledger, and hands them to engine/checkInDraft.ts.
 * Read-only; nothing is written until the operator submits.
 */
export async function getCheckInDraft(now: Date = new Date()): Promise<CheckInDraft | undefined> {
  const all = (await db.checkIns.toArray()) as StateCheckIn[];
  const latest = all.sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq)).at(-1);
  if (!latest) return undefined;
  const labels = new Map<string, string>(Object.keys(WORKOUT_TEMPLATES).map((id) => [id, id]));
  for (const t of await getCustomTemplates({ includeArchived: true })) labels.set(t.id, t.name);
  return draftCheckIn(latest, await getDaySummaries(), now, (id) => labels.get(id) ?? id);
}
